import { ZipArchive } from 'archiver';
import unzipper from 'unzipper';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import prisma from '../utils/prisma.js';
import { scanFile } from './clamav.service.js';
import { promoteToStorage, purgeTempFile, buildStoragePath, streamToWritable } from './worm.service.js';
import { computeChecksum } from '../utils/helpers.js';
import { StorageQuotaError, ThreatDetectedError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// ─── Recursive Fetch Helpers ────────────────────────────────────────────────

// Fetch all descendants (files) for a given folder id
async function getAllFilesRecursively(folderId, basePath = '') {
  let filesToZip = [];
  
  // Get direct files
  const files = await prisma.file.findMany({
    where: { folderId, isTrashed: false },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  });
  
  for (const f of files) {
    if (f.versions.length > 0) {
      filesToZip.push({
        dbFile: f,
        archivePath: `${basePath}${f.name}`
      });
    }
  }

  // Get direct subfolders
  const subfolders = await prisma.folder.findMany({
    where: { parentFolderId: folderId, isTrashed: false }
  });

  for (const sub of subfolders) {
    const subFiles = await getAllFilesRecursively(sub.id, `${basePath}${sub.name}/`);
    filesToZip = filesToZip.concat(subFiles);
  }

  return filesToZip;
}

// Prepare items for zipping: an array of fileIds and/or folderIds.
export async function prepareZipItems(fileIds = [], folderIds = []) {
  let items = []; // { dbFile, archivePath }

  // 1. Files
  if (fileIds.length > 0) {
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds }, isTrashed: false },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });
    for (const f of files) {
      if (f.versions.length > 0) {
        items.push({ dbFile: f, archivePath: f.name });
      }
    }
  }

  // 2. Folders
  if (folderIds.length > 0) {
    const folders = await prisma.folder.findMany({
      where: { id: { in: folderIds }, isTrashed: false }
    });
    for (const f of folders) {
      const subItems = await getAllFilesRecursively(f.id, `${f.name}/`);
      items = items.concat(subItems);
    }
  }

  // Deduplicate by archivePath to avoid zip errors
  const uniqueItems = [];
  const seenPaths = new Set();
  for (const item of items) {
    let finalPath = item.archivePath;
    let counter = 1;
    while (seenPaths.has(finalPath)) {
      const ext = path.extname(item.archivePath);
      const base = path.basename(item.archivePath, ext);
      finalPath = `${path.dirname(item.archivePath)}/${base} (${counter})${ext}`;
      // Clean up / prefix if dirname was empty
      if (finalPath.startsWith('./')) finalPath = finalPath.slice(2);
      counter++;
    }
    seenPaths.add(finalPath);
    item.archivePath = finalPath;
    uniqueItems.push(item);
  }

  return uniqueItems;
}

// Build a zip stream from an array of prepared items
export function createZipStream(items) {
  const archive = new ZipArchive({ zlib: { level: 4 } });
  
  // Asynchronously populate the archive so we can stream files dynamically
  populateZipArchive(archive, items).catch(err => {
    logger.error('Failed to populate zip archive', { error: err.message });
    archive.emit('error', err);
  });
  
  return archive;
}

async function populateZipArchive(archive, items) {
  for (const item of items) {
    const v = item.dbFile.versions[0];
    const spath = v.physicalPath;
    
    const pt = new PassThrough();
    archive.append(pt, { name: item.archivePath });
    
    try {
      await streamToWritable(spath, pt);
    } catch (err) {
      logger.error('Failed to stream file to zip', { storagePath: spath, error: err.message });
      // End the stream with an error message inside the zip file
      pt.end(`\n\nERROR: Failed to read file from storage server.\nDetails: ${err.message}`);
    }
  }
  
  archive.finalize();
}

// ─── Compress to Drive ──────────────────────────────────────────────────────
export async function compressToDrive(fileIds, folderIds, destFolderId, userId) {
  const items = await prepareZipItems(fileIds, folderIds);
  if (items.length === 0) throw new Error('No files to compress');

  const tempPath = path.join('public', 'uploads', `${randomUUID()}-compress.zip`);
  const output = fs.createWriteStream(tempPath);
  const archive = createZipStream(items);

  return new Promise((resolve, reject) => {
    output.on('close', async () => {
      try {
        const stats = fs.statSync(tempPath);
        const fileSize = BigInt(stats.size);

        // Check Quota
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.storageUsed + fileSize > user.storageQuota) {
          purgeTempFile(tempPath);
          return reject(new StorageQuotaError());
        }

        // AV Scan
        await scanFile(tempPath);

        // Checksum
        const fileBuffer = fs.readFileSync(tempPath);
        const checksum = computeChecksum(fileBuffer);

        let defaultName = 'archive.zip';
        if (folderIds.length === 1 && fileIds.length === 0) {
          const f = await prisma.folder.findUnique({ where: { id: folderIds[0] } });
          if (f) defaultName = `${f.name}.zip`;
        } else if (fileIds.length === 1 && folderIds.length === 0) {
          defaultName = `${items[0].dbFile.name}.zip`;
        }

        // Save to DB
        let fileRecord;
        const finalStoragePath = await prisma.$transaction(async (tx) => {
          // Check if name exists
          let baseName = path.basename(defaultName, '.zip');
          let counter = 1;
          let finalName = defaultName;
          while (await tx.file.findFirst({ where: { name: finalName, folderId: destFolderId ?? null, ownerId: userId, isTrashed: false } })) {
            finalName = `${baseName} (${counter}).zip`;
            counter++;
          }

          fileRecord = await tx.file.create({
            data: {
              name: finalName,
              mimeType: 'application/zip',
              size: fileSize,
              ownerId: userId,
              folderId: destFolderId ?? null,
            }
          });

          const storagePath = buildStoragePath(userId, fileRecord.id, 1, finalName);
          await tx.fileVersion.create({
            data: {
              fileId: fileRecord.id,
              versionNumber: 1,
              sizeBytes: fileSize,
              checksum,
              physicalPath: storagePath
            }
          });

          await tx.user.update({
            where: { id: userId },
            data: { storageUsed: { increment: fileSize } }
          });
          
          return storagePath;
        });

        promoteToStorage(tempPath, finalStoragePath);
        resolve(fileRecord);
      } catch (err) {
        purgeTempFile(tempPath);
        reject(err);
      }
    });

    archive.on('error', (err) => {
      purgeTempFile(tempPath);
      reject(err);
    });

    archive.pipe(output);
  });
}

// ─── Extract from Drive ──────────────────────────────────────────────────────
export async function extractFromDrive(zipFileId, destFolderId, userId) {
  const file = await prisma.file.findUnique({
    where: { id: zipFileId },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  });
  
  if (!file || file.ownerId !== userId || file.versions.length === 0) {
    throw new ForbiddenError('Invalid zip file');
  }

  const v = file.versions[0];
  const zipPath = v.physicalPath;
  if (!fs.existsSync(zipPath)) throw new Error('Zip file missing from storage');

  // We will extract sequentially. 
  // Read entries, for each file entry: stream to temp, AV scan, upload to WORM, save DB.
  let addedSize = 0n;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let currentUsed = user.storageUsed;
  const quota = user.storageQuota;

  // Track folder caches (path -> folderId)
  const folderCache = new Map();
  if (destFolderId) folderCache.set('.', destFolderId);

  // Helper to ensure folders exist
  async function ensurePathFolders(dirPath) {
    if (dirPath === '.' || dirPath === '') return destFolderId ?? null;
    if (folderCache.has(dirPath)) return folderCache.get(dirPath);

    const parts = dirPath.split('/').filter(Boolean);
    let parentId = destFolderId ?? null;
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (folderCache.has(currentPath)) {
        parentId = folderCache.get(currentPath);
        continue;
      }

      let folder = await prisma.folder.findFirst({
        where: { name: part, parentFolderId: parentId, ownerId: userId, isTrashed: false }
      });

      if (!folder) {
        folder = await prisma.folder.create({
          data: { name: part, parentFolderId: parentId, ownerId: userId }
        });
      }
      folderCache.set(currentPath, folder.id);
      parentId = folder.id;
    }
    return parentId;
  }

  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const filePath = entry.path;
        const type = entry.type; // 'Directory' or 'File'
        
        if (type === 'Directory') {
          // Just ensure it exists
          try {
            await ensurePathFolders(filePath);
            entry.autodrain();
          } catch(e) { entry.autodrain(); }
          return;
        }

        // It's a file
        const dirPath = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const uncompressedSize = entry.vars.uncompressedSize || 0;

        if (currentUsed + BigInt(uncompressedSize) > quota) {
          entry.autodrain();
          // We don't abort the whole extraction, just skip files that exceed quota?
          // Actually, aborting cleanly is hard with Streams, we'll just skip.
          return;
        }

        // Extract to temp
        const tempPath = path.join('public', 'uploads', `${randomUUID()}-extract`);
        const writeStream = fs.createWriteStream(tempPath);
        
        entry.pipe(writeStream).on('finish', async () => {
          try {
            // Check real size
            const stats = fs.statSync(tempPath);
            const fileSize = BigInt(stats.size);

            if (currentUsed + fileSize > quota) {
              purgeTempFile(tempPath);
              return;
            }

            // AV scan
            await scanFile(tempPath);

            const fileBuffer = fs.readFileSync(tempPath);
            const checksum = computeChecksum(fileBuffer);

            const folderId = await ensurePathFolders(dirPath);

            // DB insert
            const finalStoragePath = await prisma.$transaction(async (tx) => {
              // check existing
              let finalName = fileName;
              let baseName = path.basename(fileName, path.extname(fileName));
              let ext = path.extname(fileName);
              let counter = 1;
              while (await tx.file.findFirst({ where: { name: finalName, folderId, ownerId: userId, isTrashed: false } })) {
                finalName = `${baseName} (${counter})${ext}`;
                counter++;
              }

              const newFile = await tx.file.create({
                data: {
                  name: finalName,
                  mimeType: 'application/octet-stream', // Could guess via mime-types
                  size: fileSize,
                  ownerId: userId,
                  folderId
                }
              });

              const storagePath = buildStoragePath(userId, newFile.id, 1, finalName);
              await tx.fileVersion.create({
                data: {
                  fileId: newFile.id,
                  versionNumber: 1,
                  sizeBytes: fileSize,
                  checksum,
                  physicalPath: storagePath
                }
              });

              await tx.user.update({
                where: { id: userId },
                data: { storageUsed: { increment: fileSize } }
              });
              currentUsed += fileSize;
              
              return storagePath;
            });

            promoteToStorage(tempPath, finalStoragePath);

          } catch (e) {
            // AV failure or DB failure
            purgeTempFile(tempPath);
          }
        });
      })
      .on('error', reject)
      .on('close', () => resolve({ message: 'Extraction complete' }));
  });
}
