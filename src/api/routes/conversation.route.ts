import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { ConversationController } from '../controllers/conversation.controller';
import validateToken from '../middlewares/validate_token';

const router = Router();

router.get('/get', validateToken, ConversationController.getConversation);
router.get('/get/:id', validateToken, ConversationController.getConversationById);
router.post('/create', validateToken, ConversationController.createConversation);
router.delete('/delete/:id', validateToken, ConversationController.deleteConversation);
router.get('/file/:id', validateToken, ConversationController.getConversationFile);

export default router;
