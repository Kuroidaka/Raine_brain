import { Router } from 'express';
import testRoutes from './test.route';
import brainRoutes from './brain.route';
import authRoutes from './auth.route';
import userRoutes from './user.route';
import conversationRoutes from './conversation.route';
import reminderRoutes from './reminder.route';

const router = Router();

router.use('/test', testRoutes);
router.use('/brain', brainRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/conversation', conversationRoutes);
router.use('/reminder', reminderRoutes);

export default router;
