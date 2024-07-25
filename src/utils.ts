import * as fs from 'fs';
import * as path from 'path';

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
