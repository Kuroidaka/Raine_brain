import { Router, Request, Response } from 'express';
import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { UserController } from '../controllers/user.controller';
import { ChatDto } from '~/dto/chat.dto';
import { RegisterDto } from '~/dto/auth.dto';
import { CreateUserDto } from '~/dto/user.dto';
import validateToken from '../middlewares/validate_token';

const router = Router();

router.get('/:id',  UserController.getUser);
router.get('/', UserController.getUsers);
router.post('/', validateToken, validateDto(CreateUserDto), UserController.createUser);


export default router;
