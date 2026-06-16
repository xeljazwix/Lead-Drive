import { CronJob } from 'cron';
import prisma from '../utils/prisma.js';
import { purgeFile } from './worm.service.js';
import { logger } from '../utils/logger.js';

// ─── Trash Purge Service ──────────────────────────────────────────────────────
// Permanently deletes files and folders that have been in trash for > 30 days.
// Runs once daily at 02:00 UTC.

const PURGE_THRESHOLD_DAYS = 30;

export async function runTrashPurge() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURGE_THRESHOLD_DAYS);

  logger.info('Starting trash purge job', { cutoff: cutoff.toISOString() });

  // ── Purge Files ──────────────────────────────────────────────────────────
  const expiredFiles = await prisma.file.findMany({
    where: {
      isTrashed: true,
      trashedAt: { lte: cutoff },
    },
    include: { versions: true },
  });

  let filesDeleted = 0;
  for (const file of expiredFiles) {
    try {
      // Delete physical versions from disk
      for (const version of file.versions) {
        await purgeFile(version.physicalPath);
      }

      // Decrement owner's storage usage
      const totalSize = file.versions.reduce((acc, v) => acc + v.sizeBytes, 0n);
      await prisma.$transaction([
        prisma.file.delete({ where: { id: file.id } }),
        prisma.user.update({
          where: { id: file.ownerId },
          data: { storageUsed: { decrement: totalSize } },
        }),
      ]);

      filesDeleted++;
    } catch (err) {
      logger.error('Error purging file', { fileId: file.id, err: err.message });
    }
  }

  // ── Purge Folders ────────────────────────────────────────────────────────
  // Only purge leaf folders that have no remaining children (files already purged above)
  const expiredFolders = await prisma.folder.findMany({
    where: {
      isTrashed: true,
      trashedAt: { lte: cutoff },
      files: { none: {} },
      subFolders: { none: {} },
    },
  });

  let foldersDeleted = 0;
  for (const folder of expiredFolders) {
    try {
      await prisma.folder.delete({ where: { id: folder.id } });
      foldersDeleted++;
    } catch (err) {
      logger.error('Error purging folder', { folderId: folder.id, err: err.message });
    }
  }

  logger.info('Trash purge complete', { filesDeleted, foldersDeleted });
  return { filesDeleted, foldersDeleted };
}

// ─── Schedule the job (daily at 02:00 UTC) ───────────────────────────────────
export function startTrashPurgeCron() {
  const job = new CronJob(
    '0 2 * * *',          // 02:00 daily
    runTrashPurge,
    null,
    true,                 // start immediately
    'UTC',
  );
  logger.info('Trash purge cron scheduled (daily @ 02:00 UTC)');
  return job;
}
