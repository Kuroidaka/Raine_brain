import { Request } from 'express';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFilePath } from '~/constant';

const audioPath = uploadFilePath.audioPath
const imagePath = uploadFilePath.imagePath
const vectorDBPath = uploadFilePath.vectorDBPath
const videoRecordPath = uploadFilePath.videoRecordPath
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

if (!fs.existsSync(videoRecordPath)) {
  fs.mkdirSync(videoRecordPath, { recursive: true });
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
    
    // Validate file type
    if (['.mp3', '.wav', '.webm', '.flac', '.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      console.error(`Invalid file type: ${ext}`);
      cb(new Error('Invalid file type for upload. Accepted types are: .mp3, .wav, .webm, .flac, .jpg, .jpeg, .png'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Set a limit of 10MB per file, adjust if needed
  },
});

// Define storage engine
const storage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3'].includes(ext)) {
      cb(null, audioPath);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, imagePath);
    } else if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
      cb(null, videoRecordPath);
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
    if (['.mp3', '.wav', '.webm', '.flac', '.jpg', '.jpeg', '.png', '.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
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


// defind multer for video record
const videoRecordStorage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, videoRecordPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

export const videoRecordUpload = multer({
  storage: videoRecordStorage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

