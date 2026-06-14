import { Router } from 'express';
import authRoutes   from './auth.routes.js';
import fileRoutes   from './file.routes.js';
import folderRoutes from './folder.routes.js';
import adminRoutes  from './admin.routes.js';
import userRoutes   from './user.routes.js';
import chatRoutes   from './chat.routes.js';
import pushRoutes   from './push.routes.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { search } from '../controllers/file.controller.js';
import {
  createPublicLink, resolvePublicLink, resolvePublicSubfolder, publicDownload, publicDownloadZip
} from '../controllers/publicLink.controller.js';

const router = Router();

router.use('/auth',    authRoutes);
router.use('/files',   fileRoutes);
router.use('/folders', folderRoutes);
router.use('/admin',   adminRoutes);
router.use('/users',   userRoutes);
router.use('/chat',    chatRoutes);
router.use('/push',    pushRoutes);

// Global search endpoint
router.get('/search', authenticate, search);

// ─── Public Share Links (no auth for GET) ────────────────────────────────────
router.post('/public-links', authenticate, createPublicLink);
router.get('/p/:token',               resolvePublicLink);
router.get('/p/:token/folder/:id',    resolvePublicSubfolder);
router.get('/p/:token/download/:fileId', publicDownload);
router.get('/p/:token/download-zip',  publicDownloadZip);

export default router;
