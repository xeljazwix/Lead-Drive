import { Router } from 'express';
import {
  uploadFile, downloadFile, getVersions, restoreVersion,
  trashFile, restoreFromTrash, toggleStar, shareFile,
  getStarred, getTrashed, getRecent, getSharedWithMe, search,
  copyFiles, moveFiles, emptyTrash, hardDeleteFile, scanBeforeDownload,
  downloadZip, compressItems, extractZip, getThumbnail
} from '../controllers/file.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rate-limiter.middleware.js';

const router = Router();

// All file routes require authentication
router.use(authenticate);

// File listings
router.get('/starred',        getStarred);
router.get('/trash',          getTrashed);
router.get('/recent',         getRecent);
router.get('/shared-with-me', getSharedWithMe);

// Upload — rate limited
router.post('/', uploadLimiter, upload.single('file'), uploadFile);

// Bulk operations
router.post('/copy', copyFiles);
router.patch('/move', moveFiles);
router.post('/compress', compressItems);

// Download ZIP (must come before /:id otherwise 'download' matches :id)
router.get('/download/zip', downloadZip);

// Per-file operations
router.get('/:id/scan',           scanBeforeDownload);
router.get('/:id/download',       downloadFile);
router.get('/:id/thumbnail',      getThumbnail);
router.post('/:id/extract',       extractZip);
router.get('/:id/versions',       getVersions);
router.post('/:id/restore',       restoreVersion);
router.post('/:id/restore-trash', restoreFromTrash);
router.delete('/trash/empty',     emptyTrash);
router.delete('/:id/hard',        hardDeleteFile);
router.delete('/:id',             trashFile);
router.patch('/:id/star',         toggleStar);
router.post('/:id/share',         shareFile);

export default router;
