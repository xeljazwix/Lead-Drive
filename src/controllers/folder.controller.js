import prisma from '../utils/prisma.js';
import { asyncHandler } from '../utils/helpers.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { getIo } from '../socket.js';
import * as pushService from '../services/push.service.js';
import { buildStoragePath, copyStorageFile } from '../services/worm.service.js';

// ─── Helper: transitively soft-delete a folder and all its contents ───────────
async function trashFolderRecursive(folderId, trashedAt, tx) {
  const subFolders = await tx.folder.findMany({ where: { parentFolderId: folderId } });
  for (const sub of subFolders) {
    await trashFolderRecursive(sub.id, trashedAt, tx);
  }
  await tx.file.updateMany({
    where: { folderId, isTrashed: false },
    data: { isTrashed: true, trashedAt },
  });
  await tx.folder.update({
    where: { id: folderId },
    data: { isTrashed: true, trashedAt },
  });
}

// ─── POST /api/folders ───────────────────────────────────────────────────────
export const createFolder = asyncHandler(async (req, res) => {
  const { name, parentFolderId } = req.body;
  if (!name) throw new BadRequestError('Folder name is required');

  if (parentFolderId) {
    const parent = await prisma.folder.findUnique({ where: { id: parentFolderId } });
    if (!parent || parent.ownerId !== req.user.id) {
      throw new ForbiddenError('Parent folder not found or access denied');
    }
  }

  const folder = await prisma.folder.create({
    data: { name, ownerId: req.user.id, parentFolderId: parentFolderId ?? null },
  });

  res.status(201).json({ status: 'success', folder });
});

// ─── GET /api/folders/root/contents ──────────────────────────────────────────
// Returns all root-level (parentFolderId = null) folders and files for the user.
export const getRootContents = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { ownerId: userId, parentFolderId: null, isTrashed: false },
      orderBy: { name: 'asc' },
    }),
    prisma.file.findMany({
      where: { ownerId: userId, folderId: null, isTrashed: false },
      orderBy: { name: 'asc' },
    }),
  ]);
  res.json({ status: 'success', folders, files });
});

// ─── GET /api/folders/:id/contents ───────────────────────────────────────────
export const getFolderContents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.isTrashed) throw new NotFoundError('Folder is in trash');

  // Allow if owner OR if the user has been shared access to this folder or any ancestor
  if (folder.ownerId !== userId) {
    const hasAccess = await checkSharedAccess(id, userId);
    if (!hasAccess) throw new ForbiddenError('Access denied');
  }

  const [subFolders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { parentFolderId: id, isTrashed: false },
      orderBy: { name: 'asc' },
    }),
    prisma.file.findMany({
      where: { folderId: id, isTrashed: false },
      orderBy: { name: 'asc' },
    }),
  ]);

  res.json({ status: 'success', folder, subFolders, files });
});

// Walk up the folder tree checking if the user has been shared any ancestor (or the folder itself)
async function checkSharedAccess(folderId, userId) {
  let currentId = folderId;
  while (currentId) {
    const share = await prisma.fileShare.findFirst({
      where: { folderId: currentId, sharedWithUserId: userId },
    });
    if (share) return true;
    const current = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentFolderId: true },
    });
    if (!current) break;
    currentId = current.parentFolderId;
  }
  return false;
}

// ─── PATCH /api/folders/:id ───────────────────────────────────────────────────
export const renameFolder = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new BadRequestError('name is required');

  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.ownerId !== req.user.id) throw new NotFoundError('Folder not found');

  const updated = await prisma.folder.update({
    where: { id: req.params.id },
    data: { name },
  });
  res.json({ status: 'success', folder: updated });
});

// ─── DELETE /api/folders/:id ─────────────────────────────────────────────────
// Transitively soft-deletes the folder and all descendant folders/files.
export const trashFolder = asyncHandler(async (req, res) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.ownerId !== req.user.id) throw new NotFoundError('Folder not found');
  if (folder.isTrashed) throw new BadRequestError('Folder is already in trash');

  const trashedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await trashFolderRecursive(folder.id, trashedAt, tx);
  });

  res.json({ status: 'success', message: 'Folder and all contents moved to trash' });
});

// ─── POST /api/folders/:id/restore-trash ─────────────────────────────────────
export const restoreFolderFromTrash = asyncHandler(async (req, res) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.ownerId !== req.user.id) throw new NotFoundError('Folder not found');
  if (!folder.isTrashed) throw new BadRequestError('Folder is not in trash');

  // Only restore the top-level folder; descendants stay trashed unless user manually restores
  await prisma.folder.update({
    where: { id: folder.id },
    data: { isTrashed: false, trashedAt: null },
  });
  res.json({ status: 'success', message: 'Folder restored from trash' });
});

// ─── POST /api/folders/:id/share ─────────────────────────────────────────────
export const shareFolder = asyncHandler(async (req, res) => {
  const { sharedWithUsername, permissionLevel } = req.body;
  if (!sharedWithUsername || !permissionLevel) {
    throw new BadRequestError('sharedWithUsername and permissionLevel are required');
  }
  if (!['VIEWER', 'EDITOR'].includes(permissionLevel)) {
    throw new BadRequestError('permissionLevel must be VIEWER or EDITOR');
  }

  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.ownerId !== req.user.id) throw new ForbiddenError('Access denied');

  const targetUser = await prisma.user.findUnique({ where: { username: sharedWithUsername } });
  if (!targetUser) throw new NotFoundError('User not found');
  if (targetUser.id === req.user.id) throw new BadRequestError('Cannot share with yourself');

  const share = await prisma.fileShare.upsert({
    where: { folderId_sharedWithUserId: { folderId: folder.id, sharedWithUserId: targetUser.id } },
    create: { folderId: folder.id, sharedWithUserId: targetUser.id, permissionLevel },
    update: { permissionLevel },
  });

  // Notify the recipient via socket
  try {
    const io = getIo();
    const sharer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, fullName: true, avatarUrl: true },
    });
    const payload = {
      type: 'folder_shared',
      sharer,
      item: { id: folder.id, name: folder.name, type: 'folder' },
      permissionLevel,
    };
    io.to(`user:${targetUser.id}`).emit('notification', payload);
  } catch (_) { /* socket may not be ready */ }

  try {
    const sharerName = req.user.fullName || req.user.username;
    await pushService.sendPushNotification(targetUser.id, {
      title: `${sharerName} shared a folder`,
      body: `Folder: ${folder.name}`,
      data: { url: '/drive/shared' }
    });
  } catch(e) {}

  res.status(201).json({ status: 'success', share });
});

// ─── POST /api/folders/copy ──────────────────────────────────────────────────
async function copyFolderRecursive(folderId, targetParentFolderId, userId, isTopLevel) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.ownerId !== userId || folder.isTrashed) return null;

  const newFolder = await prisma.folder.create({
    data: {
      name: isTopLevel ? `Copy of ${folder.name}` : folder.name,
      ownerId: userId,
      parentFolderId: targetParentFolderId ?? null
    }
  });

  const { buildStoragePath, lockFile } = await import('../services/worm.service.js');
  
  const files = await prisma.file.findMany({ 
    where: { folderId, isTrashed: false },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  });
  
  let sizeAdded = BigInt(0);

  for (const file of files) {
    const latestVersion = file.versions[0];
    if (!latestVersion) continue;

    const newFile = await prisma.file.create({
      data: {
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        ownerId: userId,
        folderId: newFolder.id
      }
    });

    const newStoragePath = buildStoragePath(userId, newFile.id, 1, newFile.name);
    await copyStorageFile(latestVersion.physicalPath, newStoragePath);

    await prisma.fileVersion.create({
      data: {
        fileId: newFile.id,
        physicalPath: newStoragePath,
        checksum: latestVersion.checksum,
        versionNumber: 1,
        sizeBytes: latestVersion.sizeBytes
      }
    });
    sizeAdded += latestVersion.sizeBytes;
  }

  if (sizeAdded > 0n) {
    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: sizeAdded } }
    });
  }

  const subfolders = await prisma.folder.findMany({ where: { parentFolderId: folderId, isTrashed: false } });
  for (const sub of subfolders) {
    await copyFolderRecursive(sub.id, newFolder.id, userId, false);
  }

  return newFolder;
}

export const copyFolders = asyncHandler(async (req, res) => {
  const { folderIds, targetFolderId } = req.body;
  if (!folderIds || !Array.isArray(folderIds)) throw new BadRequestError('folderIds must be an array');

  if (targetFolderId) {
    const target = await prisma.folder.findUnique({ where: { id: targetFolderId } });
    if (!target || target.ownerId !== req.user.id) throw new ForbiddenError('Target folder not found');
  }

  let copiedCount = 0;
  for (const id of folderIds) {
    const newF = await copyFolderRecursive(id, targetFolderId, req.user.id, true);
    if (newF) copiedCount++;
  }

  res.json({ status: 'success', copied: copiedCount });
});

// ─── PATCH /api/folders/move ─────────────────────────────────────────────────
export const moveFolders = asyncHandler(async (req, res) => {
  const { folderIds, targetFolderId } = req.body;
  if (!folderIds || !Array.isArray(folderIds)) throw new BadRequestError('folderIds must be an array');

  if (targetFolderId) {
    const target = await prisma.folder.findUnique({ where: { id: targetFolderId } });
    if (!target || target.ownerId !== req.user.id) throw new ForbiddenError('Target folder not found');
    
    if (folderIds.includes(targetFolderId)) {
      throw new BadRequestError('Cannot move folder into itself');
    }
  }

  const updated = await prisma.folder.updateMany({
    where: { id: { in: folderIds }, ownerId: req.user.id },
    data: { parentFolderId: targetFolderId ?? null }
  });

  res.json({ status: 'success', moved: updated.count });
});
