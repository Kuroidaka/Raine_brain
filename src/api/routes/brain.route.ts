import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { BrainController } from '../controllers/brain.controller';
import { ChatDto } from '~/dto/chat.dto';

const router = Router();

router.post('/chat', validateDto(ChatDto), BrainController.chat);


export default router;
