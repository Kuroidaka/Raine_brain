import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { TestController } from '../controllers/test.controller'



const router = Router();

router.get('/ping', TestController.ping);
router.post('/do', TestController.testCreateMemo);
router.get('/do1', TestController.testGetListMemo);
router.delete('/do2', TestController.resetMemo);
router.post('/consider_memo', TestController.considerMemo);
router.get('/consider_get_relevant', TestController.considerMemoRetrieval);


export default router;
