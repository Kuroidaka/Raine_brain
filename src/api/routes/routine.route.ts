import { Router } from 'express';
import { validateDto } from '~/api/middlewares';
import { CreateRoutineDto, UpdateRoutineDatesDto, UpdateRoutineDto } from '~/dto/routine.dto';
import validateToken from '../middlewares/validate_token';
import { routineController } from '../controllers/routine.controller';
import { validateGgTokenOptional } from '../middlewares/validateGoogleTokenOp';

const router = Router();

router.post('/create', validateToken, validateGgTokenOptional, validateDto(CreateRoutineDto), routineController.createRoutine);
router.get('/get', validateToken, routineController.getRoutines);
router.get('/get/:id', validateToken, routineController.getRoutineById);
router.patch('/update/:id/dates', validateToken, validateGgTokenOptional, validateDto(UpdateRoutineDatesDto), routineController.updateRoutineDate);
router.patch('/update/:id', validateToken, validateGgTokenOptional, validateDto(UpdateRoutineDto), routineController.updateRoutine);
router.patch('/toggle-status/:id', validateToken, validateGgTokenOptional, routineController.toggleRoutineStatus);
router.delete('/delete/:id', validateToken, validateGgTokenOptional, routineController.deleteRoutine);

export default router;
