import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pako from 'pako';
import base64js from 'base64-js';
import sharp from 'sharp';
import { ChatCompletionContentPartImage } from './services/llm/llm.interface';
import { tools } from './database/toolCall/toolCall.interface';
import { toolsDefined, ToolsDefinedType } from './services/llm/tool';


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

export const compressBase64Data = (base64Data:string) => {
  // Decode Base64 data to binary
  const binaryData = base64js.toByteArray(base64Data);

  // Compress binary data using pako
  const compressedData = pako.gzip(binaryData);

  // Encode compressed data back to Base64
  const compressedBase64Data = base64js.fromByteArray(compressedData);

  return compressedBase64Data;
};

// Example usage
// const base64Data = 'YourBase64DataHere';
// const compressedBase64Data = compressBase64Data(base64Data);

// Supporting functions
export async function resizeImage(imageBuffer: Buffer, maxDimension: number): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
  
    let width = metadata.width ?? 0;
    let height = metadata.height ?? 0;
  
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        width = maxDimension;
        height = Math.floor((height as number) * (maxDimension / (width as number)));
      } else {
        height = maxDimension;
        width = Math.floor((width as number) * (maxDimension / (height as number)));
      }
  
      return await image.resize(width, height).toBuffer();
    }
  
    return imageBuffer;
}
  
export async function convertToPng(imageBuffer: Buffer): Promise<Buffer> {
return await sharp(imageBuffer).png().toBuffer();
}
  

export async function processImage(filePath: string, maxSize = 6480): Promise<{ encodedImage: string, maxDim: number }> {
    const imageBuffer = fs.readFileSync(filePath);
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
  
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
  
    if (metadata.format === 'png' && width <= maxSize && height <= maxSize) {
      return {
        encodedImage: base64js.fromByteArray(new Uint8Array(imageBuffer)),
        maxDim: Math.max(width, height)
      };
    } else {
      const resizedImage = await resizeImage(imageBuffer, maxSize);
      const pngImage = await convertToPng(resizedImage);
      const resizedMetadata = await sharp(resizedImage).metadata();
  
      return {
        encodedImage: base64js.fromByteArray(new Uint8Array(pngImage)),
        maxDim: Math.max(resizedMetadata.width ?? 0, resizedMetadata.height ?? 0)
      };
    }
}
  
export async function createImageContent(image: string, maxdim?: number, detailThreshold = 700) {
    type DetailLevel = "auto" | "low" | "high" | undefined;

    const detail:DetailLevel = maxdim && maxdim < detailThreshold ? 'low' : 'high';
    const base64Url = `data:image/jpeg;base64,${image}`
    const tmpFileUrl = await hostImages(base64Url)
    console.log("tmpFileUrl", tmpFileUrl)

    return {
        type: 'image_url',
        image_url: { 
            url: tmpFileUrl, 
            ...(detail && { detail: detail } )
        }
    } as ChatCompletionContentPartImage
}

export function formatDateTime(date = new Date()): string {
    const now = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    };

    return now.toLocaleString('en-GB', options).replace(',', '');
}

// console.log(formatDateTime());  // Example output: "Sun 11 Aug 22:51"

export function readTextFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(`Error reading the file: ${err.message}`);
                return;
            }
            resolve(data);
        });
    });
}

export function filterTools(dataArray: tools[], toolsArray: ToolsDefinedType[]): ToolsDefinedType[] {
    return dataArray.reduce((acc: ToolsDefinedType[], item) => {
        const matchedTool = toolsArray.find(tool => tool.function.name === item.aiTool.name);
        if (matchedTool) {
            acc.push(matchedTool);
        }
        return acc;
    }, []);
}


export function convertTimeHHmmToDateTime(timeString: string, startDateTime: Date): Date {
    // Extract hours and minutes from the time string
    const [hours, minutes] = timeString.split(":").map(Number);
  
    // Set the time on the startDateTime
    const dateTime = new Date(startDateTime);
    dateTime.setHours(hours, minutes, 0, 0);
  
    return dateTime;
}

export const formatTimeToHHMM = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const formattedHours = hours < 10 ? `0${hours}` : hours.toString();
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();

    return `${formattedHours}:${formattedMinutes}`;
};

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

export const hostImages = async (base64Image: string): Promise<string> => {
    const blob = base64ToBlob(base64Image, "image/jpeg");
    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: formData,
    });

    const { data } = await response.json();

    return data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
}
