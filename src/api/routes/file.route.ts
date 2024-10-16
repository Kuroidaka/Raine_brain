import { Router, Request, Response } from 'express';

import { validateDto } from '~/api/middlewares';

import validateToken from '../middlewares/validate_token';
import { FileController } from '../controllers/file.controller';
// import { uploadBGImgDto } from '~/dto/file.dto';
import { tempUpload, vectorDBUpload, videoRecordUpload } from '~/common/multer';


const router = Router();

router.get('/stream/:fileName', FileController.stream);

router.get('/background/image', validateToken, FileController.getBackgroundImage);
router.post('/background/image', validateToken, tempUpload.single('file'), FileController.uploadNewBGImg);
router.delete('/background/image/:id', validateToken, FileController.deleteBGImg);

router.post('/ask/upload', validateToken, vectorDBUpload.single('file'), FileController.uploadFile);
router.delete('/ask/delete/:id', validateToken, FileController.deleteFile);
router.get('/ask/files', validateToken, FileController.getFiles);

router.post('/video/record/:id', validateToken, videoRecordUpload.single('file'), FileController.uploadVideoRecord);
export default router;
