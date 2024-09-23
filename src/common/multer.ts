import { Request } from 'express';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFilePath } from '~/constant';

const audioPath = uploadFilePath.audioPath
const imagePath = uploadFilePath.imagePath
const vectorDBPath = uploadFilePath.vectorDBPath
// Ensure directories exist
if (!fs.existsSync(audioPath)) {
  fs.mkdirSync(audioPath, { recursive: true });
}
if (!fs.existsSync(imagePath)) {
  fs.mkdirSync(imagePath, { recursive: true });
}
if (!fs.existsSync(vectorDBPath)) {
  fs.mkdirSync(vectorDBPath, { recursive: true });
}


const tempStorage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3', '.wav', '.flac', '.webm'].includes(ext)) {
      cb(null, audioPath);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, imagePath);
    } else {
      cb(new Error('Invalid file type'), '');
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Temporarily store the file with a placeholder name
    cb(null, 'temp_' + Date.now() + path.extname(file.originalname));
  },
});


export const tempUpload = multer({
  storage: tempStorage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3', '.wav', '.webm', '.flac', '.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});


// Define storage engine
const storage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3', '.wav', '.flac', '.webm'].includes(ext)) {
      cb(null, audioPath);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, imagePath);
    } else {
      cb(new Error('Invalid file type'), '');
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
// Configure multer upload
export const upload = multer({ 
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3', '.wav', '.webm', '.flac', '.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});


// defind multer for vectorDB 
const vectorDBStorage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, vectorDBPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// upload for txt, pdf, docx, etc.
export const vectorDBUpload = multer({
  storage: vectorDBStorage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.pdf', '.docx', '.md'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});
