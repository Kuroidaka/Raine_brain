import { Router, Request, Response } from 'express';

import multer, { DiskStorageOptions, FileFilterCallback, StorageEngine } from 'multer';
import fs from 'fs';
import path from 'path';

import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { BrainController } from '../controllers/brain.controller';
import { ChatDto } from '~/dto/chat.dto';
import validateToken from '../middlewares/validate_token';
import { upload, videoRecordUpload } from '~/common/multer';
import { validateGgTokenOptional } from '../middlewares/validateGoogleTokenOp';

const router = Router();

router.post('/chat', validateToken, validateGgTokenOptional, validateDto(ChatDto), BrainController.chat);
router.post(
    '/chat/video',
    validateToken,
    upload.fields([
        { name: 'file', maxCount: 1 }, 
        { name: 'fileVideo', maxCount: 1 }
    ]),
    validateDto(ChatDto), BrainController.videoChat);
router.post('/stt', validateToken, upload.single('file'), BrainController.stt);
router.post('/tts', validateToken, BrainController.tts);
router.post('/rs_memo', validateToken, BrainController.resetLTMemo);
router.post('/test', validateToken, BrainController.test);
router.post('/rs_docs_memo', validateToken, BrainController.resetDocsMemo);


export default router;
