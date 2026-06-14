import { Router } from 'express';
import {
  createUser, listUsers, updateQuota, deleteUser, getSecurityStats,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// All admin routes: authenticated + super admin
router.use(authenticate, requireSuperAdmin);

router.post('/users',              createUser);
router.get('/users',               listUsers);
router.patch('/users/:id/quota',   updateQuota);
router.delete('/users/:id',        deleteUser);
router.get('/stats',               getSecurityStats);

export default router;
