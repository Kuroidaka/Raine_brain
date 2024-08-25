import { Router } from 'express';
import { validateDto } from '~/api/middlewares';
import { CreateRoutineDto, UpdateRoutineDto } from '~/dto/routine.dto';
import validateToken from '../middlewares/validate_token';
import { routineController } from '../controllers/routine.controller';

const router = Router();

router.post('/create', validateToken, validateDto(CreateRoutineDto), routineController.createRoutine);
router.get('/get', validateToken, routineController.getRoutines);
router.get('/get/:id', validateToken, routineController.getRoutineById);
router.patch('/update/:id', validateToken, validateDto(UpdateRoutineDto), routineController.updateRoutine);
router.patch('/toggle-status/:id', validateToken, routineController.toggleRoutineStatus);
router.delete('/delete/:id', validateToken, routineController.deleteRoutine);

export default router;
