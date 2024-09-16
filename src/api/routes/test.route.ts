import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { TestController } from '../controllers/test.controller'
import validateToken from '../middlewares/validate_token';



const router = Router();

router.get('/ping', TestController.ping);
router.post('/do', TestController.do);
router.get('/do1', TestController.testGetListMemo);
router.delete('/reset_memory', TestController.resetMemo);
router.post('/consider_memo', TestController.considerMemo);
router.get('/consider_get_relevant', TestController.considerMemoRetrieval);
router.delete('/rs_con/:id', TestController.rsConversation);
router.post('/img', validateToken, TestController.describeImageBase);
router.get('/get_collection', validateToken, TestController.getCollection);


export default router;
