import { Router, Request, Response } from 'express';

import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { CreateTaskDto, SubTaskCreateDto, SubTaskUpdateDto, UpdateTaskDto } from '~/dto/reminder.dto';
import validateToken from '../middlewares/validate_token';
import { reminderController } from '../controllers/reminder.controller';
import { validateGgTokenOptional } from '../middlewares/validateGoogleTokenOp';

const router = Router();

router.post('/create', validateToken, validateGgTokenOptional, validateDto(CreateTaskDto), reminderController.createTask);
router.get('/get', validateToken, reminderController.getTask);
router.get('/get/:id', validateToken, reminderController.getTaskById);
router.patch('/update/:id', validateToken, validateGgTokenOptional, validateDto(UpdateTaskDto), reminderController.updateTask);
router.patch('/check/:id', validateToken, reminderController.checkTask);
router.delete('/delete/:id', validateToken, validateGgTokenOptional, reminderController.deleteTask);
router.post('/update/:id/sub', validateToken, validateDto(SubTaskCreateDto), reminderController.addSubTask);
router.patch('/update/sub/:subId', validateToken, validateDto(SubTaskUpdateDto), reminderController.updateSubTask);
router.delete('/delete/sub/:subId', validateToken, reminderController.deleteSubTask);


export default router;
