import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { ConversationController } from '../controllers/conversation.controller';
import validateToken from '../middlewares/validate_token';

const router = Router();

router.get('/get', validateToken, ConversationController.getConversation);
router.post('/create', validateToken, ConversationController.createConversation);
router.delete('/delete/:id', validateToken, ConversationController.deleteConversation);


export default router;
