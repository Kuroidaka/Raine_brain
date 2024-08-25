import { Router, Request, Response } from 'express';

import { validateDto } from '~/api/middlewares';

import validateToken from '../middlewares/validate_token';
import { FileController } from '../controllers/file.controller';
import { uploadBGImgDto } from '~/dto/file.dto';
import { tempUpload } from '~/common/multer';


const router = Router();

router.get('/stream/:fileName', FileController.stream);

router.get('/background/image', validateToken, FileController.getBackgroundImage);
router.post('/background/image', validateToken, tempUpload.single('file'), FileController.uploadNewBGImg);

export default router;
