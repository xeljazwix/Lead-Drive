import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';

// ─── WORM (Write Once, Read Many) Service ─────────────────────────────────────
// Implements application-layer WORM by toggling file system permissions.
//
// Threat model addressed:
//   Rogue ransomware process running as the same OS user as Node.js
//   will be unable to overwrite or encrypt files locked at 0o444.
//
// Limitations (documented for transparency):
//   - A process running as root CAN still override permissions.
//   - OS-level immutability (chattr +i on Linux) is the gold standard
//     and should be used in production via a post-write shell call.

const STORAGE_DIR = process.env.STORAGE_DIR ?? './storage';
fs.mkdirSync(STORAGE_DIR, { recursive: true });

/**
 * Generate a deterministic storage path for a file version.
 * Structure: /storage/<ownerId>/<fileId>/v<versionNumber>.<ext>
 */
export function buildStoragePath(ownerId, fileId, versionNumber, originalName) {
  const ext = path.extname(originalName);
  const dir = path.join(STORAGE_DIR, ownerId, fileId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `v${versionNumber}${ext}`);
}

/**
 * Move a temp file to its permanent WORM-locked storage path.
 * Returns the final physical path.
 */
export function promoteToStorage(tempPath, storagePath) {
  // Move (copy + delete) since temp and storage may be on different filesystems
  fs.copyFileSync(tempPath, storagePath);
  fs.unlinkSync(tempPath);
  logger.info('File promoted to storage', { storagePath });

  // Lock: remove all write permissions
  lockFile(storagePath);
  return storagePath;
}

/**
 * Set file to read-only for owner, group, and others (0o444).
 */
export function lockFile(filePath) {
  try {
    fs.chmodSync(filePath, 0o444);
    logger.debug('File locked (0o444)', { filePath });
  } catch (err) {
    logger.error('Failed to lock file', { filePath, err: err.message });
    throw err;
  }
}

/**
 * Temporarily grant write access so the file can be deleted or overwritten.
 * MUST be followed immediately by the mutation and then re-lock or file removal.
 */
export function unlockFile(filePath) {
  try {
    fs.chmodSync(filePath, 0o644);
    logger.debug('File temporarily unlocked (0o644)', { filePath });
  } catch (err) {
    logger.error('Failed to unlock file', { filePath, err: err.message });
    throw err;
  }
}

/**
 * Permanently delete a WORM-locked file.
 * Grants write access, deletes the file, cleans up empty parent dirs.
 */
export function purgeFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  unlockFile(filePath);
  fs.unlinkSync(filePath);
  logger.info('File purged from storage', { filePath });

  // Best-effort cleanup of now-empty directories
  try {
    const dir = path.dirname(filePath);
    const entries = fs.readdirSync(dir);
    if (entries.length === 0) fs.rmdirSync(dir);
  } catch { /* non-critical */ }
}

/**
 * Purge a temp file (e.g., after a failed AV scan).
 * Temp files are never WORM-locked, so no chmod needed.
 */
export function purgeTempFile(tempPath) {
  try {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      logger.info('Temp file purged', { tempPath });
    }
  } catch (err) {
    logger.error('Failed to purge temp file', { tempPath, err: err.message });
  }
}
