import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as pushController from '../controllers/push.controller.js';

const router = Router();

router.use(authenticate);

router.get('/vapid-key', pushController.getVapidKey);
router.post('/subscribe', pushController.subscribe);
router.post('/unsubscribe', pushController.unsubscribe);

export default router;
