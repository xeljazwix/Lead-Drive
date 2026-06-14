import { Router } from 'express';
import { getUsers, getMessages } from '../controllers/chat.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/users', getUsers);
router.get('/messages/:userId', getMessages);

export default router;
