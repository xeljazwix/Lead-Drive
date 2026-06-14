import { Router } from 'express';
import { searchUsers } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/search', authenticate, searchUsers);

export default router;
