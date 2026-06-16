import prisma from '../utils/prisma.js';
import { asyncHandler } from '../utils/helpers.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import crypto from 'node:crypto';
import path from 'node:path';
import { streamToResponse } from '../services/worm.service.js';
import { prepareZipItems, createZipStream } from '../services/archive.service.js';

// ─── POST /api/public-links  (requires auth) ─────────────────────────────────
export const createPublicLink = asyncHandler(async (req, res) => {
  const { fileId, folderId, label, expiresInDays } = req.body;
  if (!fileId && !folderId) throw new BadRequestError('fileId or folderId is required');
  if (fileId && folderId) throw new BadRequestError('Only one of fileId or folderId is allowed');

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400 * 1000)
    : null;

  const link = await prisma.publicLink.create({
    data: { token, createdBy: req.user.id, fileId: fileId ?? null, folderId: folderId ?? null, label, expiresAt },
  });

  res.status(201).json({ status: 'success', token: link.token });
});

// ─── GET /api/p/:token  (public, no auth) ────────────────────────────────────
export const resolvePublicLink = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const link = await prisma.publicLink.findUnique({ where: { token } });
  if (!link) throw new NotFoundError('Link not found or expired');
  if (link.expiresAt && link.expiresAt < new Date()) throw new NotFoundError('Link has expired');

  if (link.fileId) {
    const file = await prisma.file.findUnique({
      where: { id: link.fileId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!file || file.isTrashed) throw new NotFoundError('File not found');
    return res.json({ status: 'success', type: 'file', file, label: link.label, expiresAt: link.expiresAt });
  }

  if (link.folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: link.folderId } });
    if (!folder || folder.isTrashed) throw new NotFoundError('Folder not found');
    const [subFolders, files] = await Promise.all([
      prisma.folder.findMany({ where: { parentFolderId: link.folderId, isTrashed: false }, orderBy: { name: 'asc' } }),
      prisma.file.findMany({ where: { folderId: link.folderId, isTrashed: false }, orderBy: { name: 'asc' } }),
    ]);
    return res.json({ status: 'success', type: 'folder', folder, subFolders, files, label: link.label, expiresAt: link.expiresAt });
  }
});

// ─── GET /api/p/:token/folder/:id  (public subfolder browse) ─────────────────
export const resolvePublicSubfolder = asyncHandler(async (req, res) => {
  const { token, id } = req.params;
  const link = await prisma.publicLink.findUnique({ where: { token } });
  if (!link || !link.folderId) throw new NotFoundError('Link not found');
  if (link.expiresAt && link.expiresAt < new Date()) throw new NotFoundError('Link has expired');

  // Verify this subfolder is actually a descendant of the root shared folder
  const isDescendant = await checkDescendant(id, link.folderId);
  if (!isDescendant) throw new NotFoundError('Folder not accessible via this link');

  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder || folder.isTrashed) throw new NotFoundError('Folder not found');
  const [subFolders, files] = await Promise.all([
    prisma.folder.findMany({ where: { parentFolderId: id, isTrashed: false }, orderBy: { name: 'asc' } }),
    prisma.file.findMany({ where: { folderId: id, isTrashed: false }, orderBy: { name: 'asc' } }),
  ]);
  res.json({ status: 'success', type: 'folder', folder, subFolders, files });
});

// ─── GET /api/p/:token/download/:fileId  (public download, no auth) ──────────
export const publicDownload = asyncHandler(async (req, res) => {
  const { token, fileId } = req.params;
  const link = await prisma.publicLink.findUnique({ where: { token } });
  if (!link) throw new NotFoundError('Link not found');
  if (link.expiresAt && link.expiresAt < new Date()) throw new NotFoundError('Link has expired');

  // Allow if the link is directly for this file, or if the file belongs to the shared folder tree
  let allowed = link.fileId === fileId;
  if (!allowed && link.folderId) {
    const file = await prisma.file.findUnique({ where: { id: fileId }, select: { folderId: true } });
    if (file?.folderId) {
      allowed = await checkDescendant(file.folderId, link.folderId) || file.folderId === link.folderId;
    }
  }
  if (!allowed) throw new NotFoundError('File not accessible via this link');

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
  });
  if (!file || file.isTrashed) throw new NotFoundError('File not found');
  const latest = file.versions[0];
  if (!latest) throw new NotFoundError('No file version found');

  const absPath = latest.physicalPath;

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  await streamToResponse(absPath, file.name, res);
});

// ─── GET /api/p/:token/download-zip  (public batch download, no auth) ────────
export const publicDownloadZip = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { fileIds, folderIds } = req.query;
  const link = await prisma.publicLink.findUnique({ where: { token } });
  if (!link) throw new NotFoundError('Link not found');
  if (link.expiresAt && link.expiresAt < new Date()) throw new NotFoundError('Link has expired');

  const fIds = fileIds ? fileIds.split(',').filter(Boolean) : [];
  const dirIds = folderIds ? folderIds.split(',').filter(Boolean) : [];
  if (fIds.length === 0 && dirIds.length === 0) throw new BadRequestError('No items specified');

  // If the link is for a single file, they can only download that file
  if (link.fileId) {
    if (fIds.length !== 1 || fIds[0] !== link.fileId || dirIds.length > 0) {
      throw new ForbiddenError('Not allowed to download these items via this link');
    }
  }

  // If the link is for a folder, verify everything is inside it
  if (link.folderId) {
    for (const fId of fIds) {
      const file = await prisma.file.findUnique({ where: { id: fId }, select: { folderId: true } });
      if (!file || !(file.folderId === link.folderId || await checkDescendant(file.folderId, link.folderId))) {
        throw new ForbiddenError('File not accessible via this link');
      }
    }
    for (const dId of dirIds) {
      if (!(dId === link.folderId || await checkDescendant(dId, link.folderId))) {
        throw new ForbiddenError('Folder not accessible via this link');
      }
    }
  }

  const items = await prepareZipItems(fIds, dirIds);
  if (items.length === 0) throw new NotFoundError('No files found to zip');

  let downloadName = 'archive.zip';
  if (link.label) downloadName = `${link.label}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);

  const archive = createZipStream(items);
  archive.on('error', (err) => {
    // Cannot reliably import logger here if it wasn't already, but we can do a console error or res.end
    console.error('Zip archive error in public controller:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create zip' });
    else res.end();
  });
  archive.pipe(res);
});

// Walk up the folder tree to check if `folderId` is a descendant of `rootId`
async function checkDescendant(folderId, rootId) {
  if (folderId === rootId) return true;
  let currentId = folderId;
  while (currentId) {
    const f = await prisma.folder.findUnique({ where: { id: currentId }, select: { parentFolderId: true } });
    if (!f) return false;
    if (f.parentFolderId === rootId) return true;
    currentId = f.parentFolderId;
  }
  return false;
}
