import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { TestController } from '../controllers/test.controller'



const router = Router();

router.get('/ping', TestController.ping);
router.get('/do', TestController.do);
router.get('/do1', TestController.do1);
export default router;
