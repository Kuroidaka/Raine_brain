import { Router } from 'express';
import testRoutes from './test.route';
import brainRoutes from './brain.route';

const router = Router();

router.use('/test', testRoutes);
router.use('/brain', brainRoutes);

export default router;
