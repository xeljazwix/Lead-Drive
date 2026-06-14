import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { BadRequestError } from '../utils/errors.js';

// ─── Ensure the temp directory exists at startup ──────────────────────────────
const TEMP_DIR = process.env.TEMP_DIR ?? './temp';
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─── Multer Storage — disk-based, isolated temp folder ────────────────────────
// Files land in /temp with a UUID-prefixed filename. The virus scan service
// reads them here before promoting to /storage.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

// ─── File filter — block dangerous executables at the gateway ───────────────
// Only truly dangerous executable formats are blocked.
// All other types (PSD, AI, SKETCH, DWG, etc.) are permitted and
// pass through to the ClamAV scan stage.
const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload',          // .exe
  'application/x-ms-dos-executable',   // .exe alternate
  'application/x-dosexec',             // .exe alternate
  'application/x-sh',                  // .sh shell script
  'application/x-bat',                 // .bat batch script
  'application/x-msdos-program',       // .com
  'application/x-executable',          // Linux ELF binary
]);

// Dangerous extensions as a final safety net (for files with wrong/missing MIME)
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr',
  '.vbs', '.vbe', '.js.exe', '.pif', '.ps1', '.psm1',
]);

function fileFilter(_req, file, cb) {
  const mime = (file.mimetype ?? '').toLowerCase();
  const ext  = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_MIME_TYPES.has(mime) || BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new BadRequestError(
      `File type '${file.originalname}' is not permitted for security reasons`
    ));
  }
  cb(null, true);
}

// ─── Export the middleware ────────────────────────────────────────────────────
// Max single file: 2 GiB (further constrained by per-user storage quota)
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});
