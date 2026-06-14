import crypto from 'node:crypto';

// ─── Compute SHA-256 Checksum of a Buffer ────────────────────────────────────
export function computeChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ─── Format Bytes ─────────────────────────────────────────────────────────────
export function formatBytes(bytes) {
  if (bytes === 0n || bytes === 0) return '0 Bytes';
  const n = Number(bytes);
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${parseFloat((n / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

// ─── Strip Sensitive Fields from User Object ──────────────────────────────────
export function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ─── Async wrapper for Express route handlers (avoid repetitive try/catch) ───
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
