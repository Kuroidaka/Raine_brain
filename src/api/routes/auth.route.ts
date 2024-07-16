import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { AuthController } from '../controllers/auth.controller';
import { ChatDto } from '~/dto/chat.dto';
import { LoginDto, RegisterDto } from '~/dto/auth.dto';

const router = Router();

router.post('/register', validateDto(RegisterDto), AuthController.register);
router.post('/login', validateDto(LoginDto), AuthController.login);

export default router;
