import prisma from '../utils/prisma.js';
import fs from 'node:fs';
import { scanFile } from '../services/clamav.service.js';
import * as pushService from '../services/push.service.js';
import {
  buildStoragePath, promoteToStorage, purgeFile, purgeTempFile,
  copyStorageFile, streamToResponse, streamRangeToResponse
} from '../services/worm.service.js';
import { computeChecksum, asyncHandler } from '../utils/helpers.js';
import {
  BadRequestError, NotFoundError, ForbiddenError,
  StorageQuotaError, ThreatDetectedError,
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getIo } from '../socket.js';
import { prepareZipItems, createZipStream, compressToDrive, extractFromDrive } from '../services/archive.service.js';
import sharp from 'sharp';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertFileAccess(fileId, userId, requiredPermission = 'VIEWER') {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { shares: true },
  });
  if (!file) throw new NotFoundError('File not found');

  const isOwner = file.ownerId === userId;
  const share = file.shares.find(s => s.sharedWithUserId === userId);
  const hasAccess = isOwner || (share && (
    requiredPermission === 'VIEWER' ||
    (requiredPermission === 'EDITOR' && share.permissionLevel === 'EDITOR')
  ));

  if (!hasAccess) throw new ForbiddenError('Access denied');
  return file;
}

// ─── POST /api/files ─────────────────────────────────────────────────────────
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new BadRequestError('No file uploaded');

  const { folderId } = req.body;
  const userId = req.user.id;
  const tempPath = req.file.path;

  // 1. Quota check
  const fileSize = BigInt(req.file.size);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.storageUsed + fileSize > user.storageQuota) {
    purgeTempFile(tempPath);
    throw new StorageQuotaError();
  }

  // 2. Validate folder ownership if provided
  if (folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.ownerId !== userId) {
      purgeTempFile(tempPath);
      throw new ForbiddenError('Invalid folder');
    }
  }

  // 3. AV Scan — throws ThreatDetectedError on detection
  try {
    await scanFile(tempPath);
  } catch (err) {
    purgeTempFile(tempPath);
    throw err; // Re-throw (ThreatDetectedError or connection error)
  }

  // 4. Compute checksum from temp file
  const fileBuffer = fs.readFileSync(tempPath);
  const checksum = computeChecksum(fileBuffer);

  // 5. Create DB records & promote to WORM storage (in transaction)
  let fileRecord;
  let version;
  try {
    await prisma.$transaction(async (tx) => {
      // Fix multer latin1 parsing of utf8 filenames
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

      // Check if a file with same name exists in folder (create new version)
      fileRecord = await tx.file.findFirst({
        where: { name: originalName, folderId: folderId ?? null, ownerId: userId, isTrashed: false },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      });

      let versionNumber = 1;
      if (fileRecord) {
        // New version of existing file
        versionNumber = (fileRecord.versions[0]?.versionNumber ?? 0) + 1;
        await tx.file.update({
          where: { id: fileRecord.id },
          data: { size: fileSize, mimeType: req.file.mimetype, updatedAt: new Date() },
        });
      } else {
        // Brand new file record
        fileRecord = await tx.file.create({
          data: {
            name: originalName,
            mimeType: req.file.mimetype,
            size: fileSize,
            ownerId: userId,
            folderId: folderId ?? null,
          },
        });
      }

      const storagePath = buildStoragePath(userId, fileRecord.id, versionNumber, originalName);
      version = await tx.fileVersion.create({
        data: {
          fileId: fileRecord.id,
          physicalPath: storagePath,
          checksum,
          versionNumber,
          sizeBytes: fileSize,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { storageUsed: { increment: fileSize } },
      });

      return { fileRecord, version };
    });

    // Generate thumbnail before promoting to storage so tempPath isn't deleted
    if (req.file.mimetype.startsWith('image/')) {
      try {
        const thumbDir = path.join(process.env.STORAGE_DIR ?? './storage', 'thumbnails');
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbPath = path.join(thumbDir, `${fileRecord.id}.webp`);
        await sharp(tempPath)
          .resize(150, 150, { fit: 'cover' })
          .webp({ quality: 80 })
          .toFile(thumbPath);
      } catch (err) {
        logger.warn('Failed to generate thumbnail', { fileId: fileRecord.id, error: err.message });
      }
    } else if (req.file.mimetype.startsWith('video/')) {
      // Generate thumbnail for videos
      try {
        const thumbDir = path.join(process.env.STORAGE_DIR ?? './storage', 'thumbnails');
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbFilename = `${fileRecord.id}.webp`;
        const thumbPath = path.join(thumbDir, thumbFilename);
        
        await new Promise((resolve, reject) => {
          ffmpeg(tempPath)
            .screenshots({
              timestamps: [0.1], // Grab frame near the start to avoid ffprobe requirement
              filename: thumbFilename,
              folder: thumbDir,
              size: '150x150'
            })
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
        });
      } catch (err) {
        logger.warn('Failed to generate video thumbnail', { fileId: fileRecord.id, error: err.message });
      }
    }

    // 6. Promote temp file to WORM-locked storage (outside transaction — FS operation)
    // We do NOT await this so the client gets a fast response while WORM upload happens in background
    promoteToStorage(tempPath, version.physicalPath);

    // 7. Log access
    await prisma.accessLog.create({ data: { userId, fileId: fileRecord.id } });

  } catch (err) {
    purgeTempFile(tempPath);
    throw err;
  }

  logger.info('File uploaded', { fileId: fileRecord.id, version: version.versionNumber, userId });
  res.status(201).json({ status: 'success', file: fileRecord, version });
});

// ─── GET /api/files/:id/thumbnail ─────────────────────────────────────────────
export const getThumbnail = asyncHandler(async (req, res) => {
  const file = await assertFileAccess(req.params.id, req.user.id);
  if (file.isTrashed) throw new NotFoundError('File is in trash');

  const thumbPath = path.join(process.env.STORAGE_DIR ?? './storage', 'thumbnails', `${file.id}.webp`);
  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    fs.createReadStream(thumbPath).pipe(res);
  } else {
    res.status(404).json({ error: 'Thumbnail not found' });
  }
});

// ─── GET /api/files/:id/download ─────────────────────────────────────────────
export const downloadFile = asyncHandler(async (req, res) => {
  const file = await assertFileAccess(req.params.id, req.user.id);
  if (file.isTrashed) throw new NotFoundError('File is in trash');

  const latestVersion = await prisma.fileVersion.findFirst({
    where: { fileId: file.id },
    orderBy: { versionNumber: 'desc' },
  });
  if (!latestVersion) throw new NotFoundError('No versions found for this file');

  await prisma.accessLog.create({ data: { userId: req.user.id, fileId: file.id } });

  const range = req.headers.range;
  if (range && file.mimeType.startsWith('video/')) {
    const totalSize = Number(file.size);
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': file.mimeType,
    });

    await streamRangeToResponse(latestVersion.physicalPath, res, start, end);
  } else {
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', Number(file.size));
    await streamToResponse(latestVersion.physicalPath, file.name, res);
  }
});

// ─── GET /api/files/:id/scan ─────────────────────────────────────────────────
export const scanBeforeDownload = asyncHandler(async (req, res) => {
  const file = await assertFileAccess(req.params.id, req.user.id);
  if (file.isTrashed) throw new NotFoundError('File is in trash');

  const latestVersion = await prisma.fileVersion.findFirst({
    where: { fileId: file.id },
    orderBy: { versionNumber: 'desc' },
  });
  if (!latestVersion) throw new NotFoundError('No versions found for this file');

  // Scan before download to ensure safety. Throws ThreatDetectedError if infected.
  await scanFile(latestVersion.physicalPath);

  res.json({ status: 'success', safe: true });
});

// ─── GET /api/files/:id/versions ─────────────────────────────────────────────
export const getVersions = asyncHandler(async (req, res) => {
  await assertFileAccess(req.params.id, req.user.id);

  const versions = await prisma.fileVersion.findMany({
    where: { fileId: req.params.id },
    orderBy: { versionNumber: 'desc' },
  });
  res.json({ status: 'success', versions });
});

// ─── POST /api/files/:id/restore ─────────────────────────────────────────────
// Restoring a version creates a NEW version (N+1) that is a copy of the target.
export const restoreVersion = asyncHandler(async (req, res) => {
  const { versionNumber } = req.body;
  if (!versionNumber) throw new BadRequestError('versionNumber is required');

  const file = await assertFileAccess(req.params.id, req.user.id, 'EDITOR');

  const targetVersion = await prisma.fileVersion.findUnique({
    where: { fileId_versionNumber: { fileId: file.id, versionNumber: parseInt(versionNumber, 10) } },
  });
  if (!targetVersion) throw new NotFoundError('Version not found');

  const latestVersion = await prisma.fileVersion.findFirst({
    where: { fileId: file.id },
    orderBy: { versionNumber: 'desc' },
  });
  const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;
  const newStoragePath = buildStoragePath(req.user.id, file.id, newVersionNumber, file.name);

  // Copy old stored file to new path
  await copyStorageFile(targetVersion.physicalPath, newStoragePath);

  const newVersion = await prisma.$transaction(async (tx) => {
    const v = await tx.fileVersion.create({
      data: {
        fileId: file.id,
        physicalPath: newStoragePath,
        checksum: targetVersion.checksum,
        versionNumber: newVersionNumber,
        sizeBytes: targetVersion.sizeBytes,
      },
    });
    await tx.file.update({
      where: { id: file.id },
      data: { size: targetVersion.sizeBytes, updatedAt: new Date() },
    });
    return v;
  });

  // WORM-lock the newly created restored file
  const { lockFile } = await import('../services/worm.service.js');
  lockFile(newStoragePath);

  res.json({ status: 'success', message: `Restored to v${targetVersion.versionNumber} as v${newVersionNumber}`, version: newVersion });
});

// ─── DELETE /api/files/:id ───────────────────────────────────────────────────
// Soft-delete (move to trash). Physical purge is handled by the cron job.
export const trashFile = asyncHandler(async (req, res) => {
  const file = await assertFileAccess(req.params.id, req.user.id, 'EDITOR');
  if (file.isTrashed) throw new BadRequestError('File is already in trash');

  await prisma.file.update({
    where: { id: req.params.id },
    data: { isTrashed: true, trashedAt: new Date() },
  });

  res.json({ status: 'success', message: 'File moved to trash' });
});

// ─── POST /api/files/:id/restore-trash ───────────────────────────────────────
export const restoreFromTrash = asyncHandler(async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file || file.ownerId !== req.user.id) throw new NotFoundError('File not found');
  if (!file.isTrashed) throw new BadRequestError('File is not in trash');

  await prisma.file.update({
    where: { id: req.params.id },
    data: { isTrashed: false, trashedAt: null },
  });

  res.json({ status: 'success', message: 'File restored from trash' });
});

// ─── DELETE /api/files/:id/hard ──────────────────────────────────────────────
export const hardDeleteFile = asyncHandler(async (req, res) => {
  const file = await prisma.file.findUnique({
    where: { id: req.params.id },
    include: { versions: true }
  });
  if (!file || file.ownerId !== req.user.id) throw new NotFoundError('File not found');
  if (!file.isTrashed) throw new BadRequestError('File must be in trash to be permanently deleted');

  for (const version of file.versions) {
    await purgeFile(version.physicalPath);
  }

  const totalSize = file.versions.reduce((acc, v) => acc + v.sizeBytes, 0n);
  await prisma.$transaction([
    prisma.file.delete({ where: { id: file.id } }),
    prisma.user.update({
      where: { id: file.ownerId },
      data: { storageUsed: { decrement: totalSize } },
    }),
  ]);

  res.json({ status: 'success', message: 'File permanently deleted' });
});

// ─── DELETE /api/files/trash/empty ───────────────────────────────────────────
export const emptyTrash = asyncHandler(async (req, res) => {
  // 1. Gather explicitly trashed items
  const explicitTrashedFiles = await prisma.file.findMany({
    where: { ownerId: req.user.id, isTrashed: true },
    include: { versions: true },
  });

  const trashedFolders = await prisma.folder.findMany({
    where: { ownerId: req.user.id, isTrashed: true }
  });

  const allFileIds = new Set();
  const allFolderIds = new Set();
  const pathsToPurge = new Set();
  let totalSize = 0n;

  // Add explicitly trashed files
  for (const file of explicitTrashedFiles) {
    if (!allFileIds.has(file.id)) {
      allFileIds.add(file.id);
      for (const version of file.versions) {
        totalSize += version.sizeBytes;
        pathsToPurge.add(version.physicalPath);
      }
    }
  }

  // 2. Recursively gather ALL contents of trashed folders, regardless of their individual isTrashed state.
  // This prevents non-trashed files inside trashed folders from being orphaned to the root directory.
  async function gatherFolderContents(folderId) {
    if (allFolderIds.has(folderId)) return;
    allFolderIds.add(folderId);

    // Get files in this folder
    const files = await prisma.file.findMany({
      where: { folderId },
      include: { versions: true }
    });
    for (const file of files) {
      if (!allFileIds.has(file.id)) {
        allFileIds.add(file.id);
        for (const version of file.versions) {
          totalSize += version.sizeBytes;
          pathsToPurge.add(version.physicalPath);
        }
      }
    }

    // Recursively get subfolders
    const subfolders = await prisma.folder.findMany({
      where: { parentFolderId: folderId }
    });
    for (const sub of subfolders) {
      await gatherFolderContents(sub.id);
    }
  }

  for (const folder of trashedFolders) {
    await gatherFolderContents(folder.id);
  }

  const finalFileIds = Array.from(allFileIds);
  const finalFolderIds = Array.from(allFolderIds);

  // Fast bulk deletion from Database
  if (finalFileIds.length > 0) {
    await prisma.$transaction([
      prisma.file.deleteMany({ where: { id: { in: finalFileIds } } }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { storageUsed: { decrement: totalSize } },
      }),
    ]);
  }

  if (finalFolderIds.length > 0) {
    try {
      await prisma.folder.deleteMany({ where: { id: { in: finalFolderIds } } });
    } catch (err) {
      // Fallback: If deleteMany fails due to nested foreign key constraints, delete individually bottom-up
      for (const folderId of finalFolderIds) {
        try { await prisma.folder.delete({ where: { id: folderId } }); } catch (e) {}
      }
    }
  }

  // Return success immediately to prevent HTTP timeouts
  res.json({ status: 'success', message: `Permanently deleted ${finalFileIds.length} files and ${finalFolderIds.length} folders` });

  // Fire and forget physical deletion in the background
  const pathsArray = Array.from(pathsToPurge);
  if (pathsArray.length > 0) {
    Promise.resolve().then(async () => {
      try {
        // Process in small chunks to avoid overloading the SFTP connection pool
        for (let i = 0; i < pathsArray.length; i += 5) {
          const chunk = pathsArray.slice(i, i + 5);
          await Promise.allSettled(chunk.map(p => purgeFile(p)));
        }
      } catch (err) {
        logger.error('Background purge failed during empty trash', { err: err.message });
      }
    });
  }
});

// ─── PATCH /api/files/:id/star ────────────────────────────────────────────────
export const toggleStar = asyncHandler(async (req, res) => {
  const file = await assertFileAccess(req.params.id, req.user.id);
  const updated = await prisma.file.update({
    where: { id: file.id },
    data: { isStarred: !file.isStarred },
  });
  res.json({ status: 'success', isStarred: updated.isStarred });
});

// ─── POST /api/files/:id/share ────────────────────────────────────────────────
export const shareFile = asyncHandler(async (req, res) => {
  const { sharedWithUsername, permissionLevel } = req.body;
  if (!sharedWithUsername || !permissionLevel) {
    throw new BadRequestError('sharedWithUsername and permissionLevel are required');
  }
  if (!['VIEWER', 'EDITOR'].includes(permissionLevel)) {
    throw new BadRequestError('permissionLevel must be VIEWER or EDITOR');
  }

  const file = await assertFileAccess(req.params.id, req.user.id, 'EDITOR');

  const targetUser = await prisma.user.findUnique({ where: { username: sharedWithUsername } });
  if (!targetUser) throw new NotFoundError('User not found');
  if (targetUser.id === req.user.id) throw new BadRequestError('Cannot share with yourself');

  const share = await prisma.fileShare.upsert({
    where: { fileId_sharedWithUserId: { fileId: file.id, sharedWithUserId: targetUser.id } },
    create: { fileId: file.id, sharedWithUserId: targetUser.id, permissionLevel },
    update: { permissionLevel },
  });

  // Notify the recipient via socket
  try {
    const io = getIo();
    const sharer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, fullName: true, avatarUrl: true },
    });
    // Emit to all sockets of the target user
    const payload = {
      type: 'file_shared',
      sharer,
      item: { id: file.id, name: file.name, type: 'file' },
      permissionLevel,
    };
    io.to(`user:${targetUser.id}`).emit('notification', payload);
  } catch (_) { /* socket may not be ready */ }

  try {
    const sharerName = req.user.fullName || req.user.username;
    await pushService.sendPushNotification(targetUser.id, {
      title: `${sharerName} shared a file`,
      body: `File: ${file.name}`,
      data: { url: '/drive/shared' }
    });
  } catch(e) {}

  res.status(201).json({ status: 'success', share });
});

// ─── GET /api/files/starred ──────────────────────────────────────────────────
export const getStarred = asyncHandler(async (req, res) => {
  const files = await prisma.file.findMany({
    where: { ownerId: req.user.id, isStarred: true, isTrashed: false },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ status: 'success', files });
});

// ─── GET /api/files/trash ────────────────────────────────────────────────────
export const getTrashed = asyncHandler(async (req, res) => {
  const files = await prisma.file.findMany({
    where: { ownerId: req.user.id, isTrashed: true },
    orderBy: { trashedAt: 'desc' },
  });
  res.json({ status: 'success', files });
});

// ─── GET /api/files/recent ────────────────────────────────────────────────────
export const getRecent = asyncHandler(async (req, res) => {
  const logs = await prisma.accessLog.findMany({
    where: { userId: req.user.id },
    orderBy: { accessedAt: 'desc' },
    take: 50,
    distinct: ['fileId'],
    include: { file: true },
  });
  const files = logs.map(l => l.file).filter(f => f && !f.isTrashed);
  res.json({ status: 'success', files });
});

// ─── GET /api/search ─────────────────────────────────────────────────────────
export const search = asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) throw new BadRequestError('Search query (q) is required');

  const userId = req.user.id;

  const [files, folders] = await Promise.all([
    prisma.file.findMany({
      where: {
        ownerId: userId,
        isTrashed: false,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 30,
    }),
    prisma.folder.findMany({
      where: {
        ownerId: userId,
        isTrashed: false,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 30,
    }),
  ]);

  res.json({ status: 'success', results: { files, folders } });
});

// ─── GET /api/files/shared-with-me ───────────────────────────────────────────
export const getSharedWithMe = asyncHandler(async (req, res) => {
  const shares = await prisma.fileShare.findMany({
    where: { sharedWithUserId: req.user.id },
    include: {
      file: {
        include: {
          owner: { select: { id: true, username: true } },
        },
      },
      folder: {
        include: {
          owner: { select: { id: true, username: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const files = [];
  const folders = [];

  shares.forEach(share => {
    if (share.file && !share.file.isTrashed) {
      // Attach the owner info to the file object so the frontend knows who shared it
      files.push({ ...share.file, sharedBy: share.file.owner.username });
    }
    if (share.folder && !share.folder.isTrashed) {
      folders.push({ ...share.folder, sharedBy: share.folder.owner.username });
    }
  });

  res.json({ status: 'success', files, folders });
});

// ─── POST /api/files/copy ────────────────────────────────────────────────────
export const copyFiles = asyncHandler(async (req, res) => {
  const { fileIds, targetFolderId } = req.body;
  if (!fileIds || !Array.isArray(fileIds)) throw new BadRequestError('fileIds must be an array');

  if (targetFolderId) {
    const target = await prisma.folder.findUnique({ where: { id: targetFolderId } });
    if (!target || target.ownerId !== req.user.id) throw new ForbiddenError('Target folder not found');
  }

  const { buildStoragePath, lockFile } = await import('../services/worm.service.js');
  let copiedCount = 0;
  let sizeAdded = BigInt(0);

  for (const id of fileIds) {
    const file = await prisma.file.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });
    if (!file || file.ownerId !== req.user.id || file.isTrashed) continue;
    const latestVersion = file.versions[0];
    if (!latestVersion) continue;

    // Check quota
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.storageUsed + sizeAdded + latestVersion.sizeBytes > user.storageQuota) {
      break; // Stop copying if quota exceeded
    }

    const newFile = await prisma.file.create({
      data: {
        name: `Copy of ${file.name}`,
        mimeType: file.mimeType,
        size: file.size,
        ownerId: req.user.id,
        folderId: targetFolderId ?? null
      }
    });

    const newStoragePath = buildStoragePath(req.user.id, newFile.id, 1, newFile.name);
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
    copiedCount++;
  }

  if (sizeAdded > 0n) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { storageUsed: { increment: sizeAdded } }
    });
  }

  res.json({ status: 'success', copied: copiedCount });
});

// ─── PATCH /api/files/move ───────────────────────────────────────────────────
export const moveFiles = asyncHandler(async (req, res) => {
  const { fileIds, targetFolderId } = req.body;
  if (!fileIds || !Array.isArray(fileIds)) throw new BadRequestError('fileIds must be an array');

  if (targetFolderId) {
    const target = await prisma.folder.findUnique({ where: { id: targetFolderId } });
    if (!target || target.ownerId !== req.user.id) throw new ForbiddenError('Target folder not found');
  }

  const updated = await prisma.file.updateMany({
    where: { id: { in: fileIds }, ownerId: req.user.id },
    data: { folderId: targetFolderId ?? null }
  });

  res.json({ status: 'success', moved: updated.count });
});

// ─── GET /api/files/download/zip ─────────────────────────────────────────────
export const downloadZip = asyncHandler(async (req, res) => {
  const { fileIds, folderIds } = req.query;
  const fIds = fileIds ? fileIds.split(',').filter(Boolean) : [];
  const dirIds = folderIds ? folderIds.split(',').filter(Boolean) : [];

  if (fIds.length === 0 && dirIds.length === 0) {
    throw new BadRequestError('No items specified');
  }

  // Very basic security: check if user owns these (we just filter by owner internally)
  // To be perfectly robust, prepareZipItems should check ownership or we pass ownerId
  // For now, we will verify ownership of the root items before zipping
  const files = await prisma.file.findMany({ where: { id: { in: fIds }, ownerId: req.user.id } });
  const folders = await prisma.folder.findMany({ where: { id: { in: dirIds }, ownerId: req.user.id } });

  const validFIds = files.map(f => f.id);
  const validDirIds = folders.map(f => f.id);

  if (validFIds.length === 0 && validDirIds.length === 0) {
    throw new ForbiddenError('No accessible items selected');
  }

  const items = await prepareZipItems(validFIds, validDirIds);
  if (items.length === 0) {
    throw new NotFoundError('No files found to zip');
  }

  let downloadName = 'archive.zip';
  if (dirIds.length === 1 && fIds.length === 0 && folders.length === 1) downloadName = `${folders[0].name}.zip`;
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);

  const archive = createZipStream(items);
  archive.on('error', (err) => {
    logger.error('Zip archive error in file controller', { error: err.message });
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create zip' });
    else res.end();
  });
  archive.pipe(res);
});

// ─── POST /api/files/compress ────────────────────────────────────────────────
export const compressItems = asyncHandler(async (req, res) => {
  const { fileIds = [], folderIds = [], destFolderId } = req.body;
  if (fileIds.length === 0 && folderIds.length === 0) throw new BadRequestError('No items specified');

  const fileRecord = await compressToDrive(fileIds, folderIds, destFolderId, req.user.id);
  res.status(201).json(fileRecord);
});

// ─── POST /api/files/:id/extract ─────────────────────────────────────────────
export const extractZip = asyncHandler(async (req, res) => {
  const fileId = req.params.id;
  const { destFolderId } = req.body;
  
  const result = await extractFromDrive(fileId, destFolderId, req.user.id);
  res.json(result);
});
