import { Router } from 'express';
import { validateDto } from '~/api/middlewares';
import { CreateGoalDto, UpdateGoalDto } from '~/dto/goal.dto';
import validateToken from '../middlewares/validate_token';
import { goalController } from '../controllers/goal.controller';
import { googleController } from '../controllers/google.controller';
import validateGoogleToken from '../middlewares/validateGoogleToken';
import { CreateCalendarDto, UpdateCalendarDto } from '~/dto/google.dto';

const router = Router();

router.get('/authorize', googleController.authorize);
router.get('/oauth2callback', googleController.oauth2callback);
router.get('/calendar/event/:id', validateGoogleToken, googleController.getEvent);
router.get('/calendar/event', validateGoogleToken, googleController.getEventList);
router.post('/calendar/event', validateGoogleToken, validateDto(CreateCalendarDto), googleController.createTask);
router.put('/calendar/event/:id', validateGoogleToken, validateDto(UpdateCalendarDto), googleController.updateTask);
router.delete('/calendar/event/:id', validateGoogleToken, googleController.deleteEvent);

export default router;

