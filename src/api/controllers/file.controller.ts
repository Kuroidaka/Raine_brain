import { pipeline } from 'stream';
import { NextFunction, Request, Response } from 'express';
import { createReadStream } from 'fs';
import path, { join } from 'path';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '~/common/error';
import { uploadFilePath } from '~/constant';
import mime from 'mime-types';
import { promisify } from 'util';
import { FileService } from '~/database/file/file';
import * as fs from 'fs';

const pipelineAsync = promisify(pipeline);

export const FileController = {
    stream: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { fileName } = req.params;
            // Validate fileName here if necessary

            const filePath = uploadFilePath.imagePath;
            const path = join(process.cwd(), filePath, fileName);
            const mimeType = mime.lookup(fileName) || 'application/octet-stream';
            const imageStream = createReadStream(path);

            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

            await pipelineAsync(imageStream, res);
        } catch (error) {
            console.error('Error streaming the image file:', error);
            next(new NotFoundException('Image not found'));
        }
    },
    uploadNewBGImg: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new NotFoundException("File upload failed");
            }

            // Get the instance of your file service
            const fileService = FileService.getInstance();
    
            // Extract the temp file path
            const tempFilePath = path.join(req.file.destination, req.file.filename);
            const extname = path.extname(req.file.originalname)
            // Add the new background image and get the ID
            const { id } = await fileService.addNewBackgroundImage({
                name: req.file.originalname,
                extname: extname
            });
    
            // Define the new file name using the ID
            const newFileName = `${id}${extname}`;
            const newFilePath = path.join(req.file.destination, newFileName);
    
            // Rename the file to use the ID as the name
            fs.renameSync(tempFilePath, newFilePath);
    
            // Update the URL path in the database
            const data = await fileService.updateBackgroundImage(id, {
                urlPath: `file/stream/${newFileName}`,
            });
    
            // Return the response with the updated data
            return res.status(200).json(data);
        } catch (error) {
            console.error('Error uploading the image file:', error);
            next(error);
        }
    },
    getBackgroundImage: async (req: Request, res: Response, next:NextFunction) => {
        try {
            const backgroundImageService = FileService.getInstance();
            
            const bgImgs = await backgroundImageService.getAllBackgroundImages()
            
            return res.status(200).json(bgImgs);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
}