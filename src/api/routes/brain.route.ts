import { Router, Request, Response } from 'express';

import multer, { DiskStorageOptions, FileFilterCallback, StorageEngine } from 'multer';
import fs from 'fs';
import path from 'path';

import { validateDto } from '~/api/middlewares';
import { TestDto } from '~/dto/test.dto';
import { BrainController } from '../controllers/brain.controller';
import { ChatDto } from '~/dto/chat.dto';
import validateToken from '../middlewares/validate_token';
import upload from '~/common/multer';

const router = Router();

router.post('/chat', validateToken, validateDto(ChatDto), BrainController.chat);
router.post('/stt', validateToken, upload.single('file'), BrainController.stt);
router.post('/tts', validateToken, BrainController.tts);
router.post('/test', validateToken, upload.single('file'), BrainController.test);


export default router;
