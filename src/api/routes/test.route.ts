import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { TestController } from '../controllers/test.controller'



const router = Router();

router.get('/do', validateDto(TestDto), TestController.handleTest);


export default router;
