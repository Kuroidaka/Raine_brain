import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { AuthController } from '../controllers/auth.controller';
import { ChatDto } from '~/dto/chat.dto';
import { LoginDto, RegisterDto } from '~/dto/auth.dto';
import validateToken from '../middlewares/validate_token';

const router = Router();

router.post('/register', validateDto(RegisterDto), AuthController.register);
router.post('/login', validateDto(LoginDto), AuthController.login);
router.post('/verify_token', validateToken, AuthController.verifyToken);
router.post('/regenerate_token', validateToken, AuthController.reGenToken);

export default router;
