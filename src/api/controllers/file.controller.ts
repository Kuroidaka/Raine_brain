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
import { fileProps, videoRecordProps } from '~/database/file/file.interface';
import { FileChatService } from '~/services/chat/fileAsk';
import { ConversationService } from '~/database/conversation/conversation';
import { formatDateTime } from '~/utils';
import { UserService } from '~/database/user/user';

const pipelineAsync = promisify(pipeline);

export const FileController = {
    stream: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { fileName } = req.params;
            const { type = 'image' } = req.query;
            // Validate fileName here if necessary
            
            let filePath = '';
            if(type === 'image') {
                filePath = uploadFilePath.imagePath;
            } else if(type === 'video') {
                filePath = uploadFilePath.videoRecordPath;
            } else {
                throw new BadRequestException("Invalid file type");
            }

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
    deleteBGImg: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userID = req.user.id

            const fileService = FileService.getInstance();
            
            // check if the image is used as a background image from user account
            const user = await UserService.getInstance().getUser({id: userID});
            if(user?.backgroundImage?.id === id) {
                throw new BadRequestException("Cannot delete the background image that is currently being used");
            }
            await fileService.deleteBackgroundImage(id);

            return res.status(200).json({ message: "File deleted successfully" });
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
    uploadFile: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new NotFoundException("File upload failed");
            }

            let conversationId = req.body.conversationId
            if(!conversationId) {
                const conversationService = ConversationService.getInstance();
                const conversation = await conversationService.addNewConversation({
                    userID: req.user.id,
                    name: formatDateTime(),
                });
                conversationId = conversation.id;
            }

            const fileService = FileService.getInstance();
            const newFileData:fileProps = {
                originalname: req.file.originalname,
                name: req.file.filename,
                path: req.file.path,
                extension: path.extname(req.file.filename),
                size: req.file.size,
                url: req.file.path,
                userId: req.user.id,
                conversationId: conversationId
            }
            const vectorDBPath = uploadFilePath.vectorDBPath
            const filePath = path.join(vectorDBPath, req.file.filename);

            const fileChatService = new FileChatService();
            const { ids } = await fileChatService.storageFile(filePath);
            newFileData.vectorDBIds = ids
            const { id } = await fileService.addNewFile(newFileData);

            return res.status(200).json({
                fileID: id,
                conversationID: conversationId
            });
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    deleteFile: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const fileService = FileService.getInstance();
            const { id } = req.params;

            const file = await fileService.getFile(id)
            if(!file) {
                throw new NotFoundException("File not found");
            }
            const fileChatService = new FileChatService();
            if(file.vectorDBIds) {
                await fileChatService.deleteDocs(file.vectorDBIds as string[]);
            }
            await fileService.deleteFile(id);

            await fileChatService.removeFile(file.path);
            return res.status(200).json({ message: "File deleted successfully" });
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    getFiles: async (req: Request, res: Response, next: NextFunction) => {
        try {

            const fileService = FileService.getInstance();
            const files = await fileService.getAllFiles();

            return res.status(200).json(files);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    uploadVideoRecord: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new NotFoundException("File upload failed");
            }

            const fileService = FileService.getInstance();
            const { id } = req.params;
            const videoRecordData:videoRecordProps = {
                name: req.file.filename,
                url: req.file.path,
                messageId: id
            }
            const videoRecord = await fileService.uploadVideoRecord(videoRecordData);
            return res.status(200).json(videoRecord);
            
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    streamVideoRecord: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { fileName } = req.params;
            const filePath = uploadFilePath.videoRecordPath;
            const path = join(process.cwd(), filePath, fileName);
            const mimeType = mime.lookup(fileName) || 'application/octet-stream';
            const videoStream = createReadStream(path);
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

            await pipelineAsync(videoStream, res);
        } catch (error) {
            console.error('Error streaming the video file:', error);
            next(new NotFoundException('Video not found'));
        }
    }
}