import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import multer from 'multer';

// ─── Centralized Error Handler ────────────────────────────────────────────────
// Must be registered LAST in Express middleware chain (4 arguments required).
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Multer wraps errors thrown from fileFilter in a MulterError.
  // Unwrap the original error so our AppError subclasses surface correctly.
  const actualErr = (err instanceof multer.MulterError && err.storageErrors?.[0])
    ? err.storageErrors[0]
    : err;

  // Operational errors (our AppError subclasses) — safe to expose to client
  if (actualErr instanceof AppError) {
    // Log security-critical errors differently
    if (actualErr.statusCode === 406) {
      logger.security('THREAT_DETECTED', {
        path: req.path,
        userId: req.user?.id,
        threat: actualErr.threatName,
      });
    } else if (actualErr.statusCode >= 500) {
      logger.error(actualErr.message, { stack: actualErr.stack, path: req.path });
    } else {
      logger.warn(actualErr.message, { path: req.path, userId: req.user?.id });
    }

    return res.status(actualErr.statusCode).json({
      status: 'error',
      message: actualErr.message,
    });
  }

  // Multer built-in errors (file size limit, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ status: 'error', message: 'File too large (max 2 GiB)' });
    }
    return res.status(400).json({ status: 'error', message: err.message });
  }

  // Unhandled / programmer errors — never expose internals
  logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.path });
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected internal error occurred',
  });
}

