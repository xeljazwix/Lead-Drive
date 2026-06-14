import { Router } from 'express';
import { login, register, me } from '../controllers/auth.controller.js';
import { updateProfile, updatePassword, uploadAvatar } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginLimiter } from '../middlewares/rate-limiter.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/register', loginLimiter, register);
router.get('/me', authenticate, me);

router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, updatePassword);
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);

export default router;
