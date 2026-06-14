import { Router } from 'express';
import {
  createFolder, getRootContents, getFolderContents,
  renameFolder, trashFolder, restoreFolderFromTrash, shareFolder,
  copyFolders, moveFolders
} from '../controllers/folder.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Static route BEFORE parameterized — avoids "root" being treated as an ID
router.get('/root/contents', getRootContents);

router.post('/',                       createFolder);
router.post('/copy',                   copyFolders);
router.patch('/move',                  moveFolders);
router.get('/:id/contents',            getFolderContents);
router.patch('/:id',                   renameFolder);
router.delete('/:id',                  trashFolder);
router.post('/:id/restore-trash',      restoreFolderFromTrash);
router.post('/:id/share',              shareFolder);

export default router;
