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
router.post('/unlink-gmail', validateToken, googleController.unlinkGmail);
router.get('/oauth2callback', googleController.oauth2callback);
router.get('/calendar/event/:id', validateToken, validateGoogleToken, googleController.getEvent);
router.get('/calendar/event', validateToken, validateGoogleToken, googleController.getEventList);
router.post('/calendar/event', validateToken, validateGoogleToken, validateDto(CreateCalendarDto), googleController.createTask);
router.put('/calendar/event/:id', validateToken, validateGoogleToken, validateDto(UpdateCalendarDto), googleController.updateTask);
router.delete('/calendar/event/:id', validateToken, validateGoogleToken, googleController.deleteEvent);
router.post('/auth/verify_token', validateToken, validateGoogleToken, googleController.validateUserToken);

export default router;

