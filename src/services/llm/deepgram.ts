
import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { deepgramClient } from '~/config';
import { ReadableStream } from 'stream/web';
import { NotImplementedException } from '~/common/error';

const audioPath = 'src/assets/file/audio';
export const DeepGramService = {
  tts: async (text:string) => {
    try {
      
      const outputFile = path.join(audioPath, `output_${Date.now()}.mp3`)

      const response = await deepgramClient.speak.request(
        { text },
        {
          model: 'aura-asteria-en',
        }
      );

      const stream = await response.getStream();
      if (stream) {
        const file = fs.createWriteStream(outputFile);
          await pipeline(stream as ReadableStream<Uint8Array>, file);
          console.log(`Audio file written to ${outputFile}`);
      } else {
        throw new NotImplementedException("Error occur while text to speech with deepgram")
      }

      return outputFile

    } catch (error) {
      console.error(error);
      throw new NotImplementedException("Error occur while text to speech with deepgram")
    }
  },  
}
