import { Request } from 'express';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';

// Define paths
const audioPath = 'src/assets/file/audio';
const imagePath = 'src/assets/file/image';

// Ensure directories exist
if (!fs.existsSync(audioPath)) {
  fs.mkdirSync(audioPath, { recursive: true });
}
if (!fs.existsSync(imagePath)) {
  fs.mkdirSync(imagePath, { recursive: true });
}

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
const upload = multer({ 
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

export default upload;
