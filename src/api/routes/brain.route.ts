import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { BrainController } from '../controllers/brain.controller';
import { ChatDto } from '~/dto/chat.dto';
import validateToken from '../middlewares/validate_token';

const router = Router();

router.post('/chat', validateToken, validateDto(ChatDto), BrainController.chat);
router.post('/test', BrainController.test);


export default router;
