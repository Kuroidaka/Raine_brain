import { Router } from 'express';
import { validateDto } from '~/api/middlewares';
import { CreateGoalDto, UpdateGoalDto } from '~/dto/goal.dto';
import validateToken from '../middlewares/validate_token';
import { goalController } from '../controllers/goal.controller';
import { googleController } from '../controllers/google.controller';

import { CreateCalendarDto, UpdateCalendarDto } from '~/dto/google.dto';
import { validateGoogleToken } from '../middlewares/validateGoogleToken';

const router = Router();

router.get('/link-gmail', googleController.linkGmail);
router.post('/unlink-gmail', validateToken, validateGoogleToken, googleController.unlinkGmail);
router.get('/oauth2callback', googleController.oauth2callback);

router.post('/calendar/task', validateToken, validateGoogleToken, googleController.createTask);
router.post('/calendar/task-list/init', validateToken, validateGoogleToken, googleController.initTaskList);

router.post('/calendar/event/init', validateToken, validateGoogleToken, googleController.initEventList);
router.get('/calendar/event/:id', validateToken, validateGoogleToken, googleController.getEvent);
router.get('/calendar/event', validateToken, validateGoogleToken, googleController.getEventList);
router.post('/calendar/event', validateToken, validateGoogleToken, validateDto(CreateCalendarDto), googleController.createEvent);
// router.put('/calendar/event/:id', validateToken, validateGoogleToken, validateDto(UpdateCalendarDto), googleController.updateEvent);
router.delete('/calendar/event/:id', validateToken, validateGoogleToken, googleController.deleteEvent);
router.post('/auth/verify_token', validateToken, validateGoogleToken, googleController.validateUserToken);

export default router;

