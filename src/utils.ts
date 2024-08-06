import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function assert(condition: boolean, message="while assert inputText should be equal to inputText2") {
    if (!condition) {
        throw new Error(message);
    }
}

export const deleteFilesInDirectory = (directory: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.readdir(directory, (err, files) => {
            if (err) {
                return reject(`Could not list the directory: ${err}`);
            }

            const fileDeletePromises = files.map(file => {
                const filePath = path.join(directory, file);
                
                return new Promise<void>((resolve, reject) => {
                    fs.stat(filePath, (error, stat) => {
                        if (error) {
                            return reject(`Error stating file: ${error}`);
                        }

                        if (stat.isFile()) {
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    return reject(`Error deleting file: ${err}`);
                                } else {
                                    resolve();
                                }
                            });
                        } else {
                            resolve();
                        }
                    });
                });
            });

            Promise.all(fileDeletePromises)
                .then(() => resolve())
                .catch(err => reject(err));
        });
    });
};

export function deleteFolderRecursive(folderPath: string): void {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const currentPath = path.join(folderPath, file);
            if (fs.lstatSync(currentPath).isDirectory()) {
                // Recursively delete subfolder
                deleteFolderRecursive(currentPath);
            } else {
                // Delete file
                fs.unlinkSync(currentPath);
            }
        });
        // Delete the now-empty folder
        fs.rmdirSync(folderPath);
    }
}



export const generateId = (): string => {
  return uuidv4();
};


export const splitText = (text:string , maxLength:number) => {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = '';
  
    for (const word of words) {
      if ((currentChunk + word).length > maxLength) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += `${word} `;
    }
  
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }
  
    return chunks;
  };