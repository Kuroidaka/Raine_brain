import { Router } from 'express';
import { validateDto } from '~/api/middlewares';
import { CreateGoalDto, UpdateGoalDto } from '~/dto/goal.dto';
import validateToken from '../middlewares/validate_token';
import { goalController } from '../controllers/goal.controller';

const router = Router();

router.post('/create', validateToken, validateDto(CreateGoalDto), goalController.createGoal);
router.get('/get', validateToken, goalController.getGoals);
router.get('/get/:id', validateToken, goalController.getGoalById);
router.patch('/update/:id', validateToken, validateDto(UpdateGoalDto), goalController.updateGoal);
router.delete('/delete/:id', validateToken, goalController.deleteGoal);

export default router;
