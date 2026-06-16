/**
 * ─── WORM (Write Once, Read Many) Service ─────────────────────────────────────
 *
 * This module is now a thin shim over src/utils/storage.js which supports
 * both local filesystem and SFTP backends.
 *
 * Re-exports the unified storage API so existing callers that import from
 * here continue to work without changes.
 */

export {
  buildStoragePath,
  promoteToStorage,
  copyStorageFile,
  streamToResponse,
  streamRangeToResponse,
  streamToWritable,
  purgeStorageFile  as purgeFile,
  resolveToLocalPath,
} from '../utils/storage.js';

// Legacy alias used by a few controllers
export { purgeStorageFile as purgeTempFile } from '../utils/storage.js';

/**
 * lockFile / unlockFile are no-ops in SFTP mode (no chmod on remote FS).
 * Kept as exports so any direct callers don't break at import time.
 */
import fs from 'node:fs';
import { logger } from '../utils/logger.js';

function isFtp() {
  return (process.env.STORAGE_BACKEND ?? 'local').toLowerCase() === 'ftp';
}

export function lockFile(filePath) {
  if (isFtp()) return;
  try { fs.chmodSync(filePath, 0o444); } catch (err) {
    logger.error('Failed to lock file', { filePath, err: err.message });
  }
}

export function unlockFile(filePath) {
  if (isFtp()) return;
  try { fs.chmodSync(filePath, 0o644); } catch (err) {
    logger.error('Failed to unlock file', { filePath, err: err.message });
  }
}
