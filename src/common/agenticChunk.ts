import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { uploadFilePath } from '~/constant';
import { NotImplementedException } from './error';

// Define a function to upload a file
export async function agenticChunk(filePath: string): Promise<any> {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));  // Append the file stream to the form

    const response = await axios.post('http://127.0.0.1:9001/chunking/', form, {
      headers: {
        ...form.getHeaders(),  // Include headers for multipart/form-data
      },
    });

    console.log('Chunks:', response.data);  // Log the response from the Python API
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Error uploading file:', error.response.data);
    }
    console.error("An error occurred while the agentic chunking text function:", error);
    throw new NotImplementedException("Error while agentic chunking text");
  }
}

