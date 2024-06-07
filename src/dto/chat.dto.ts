import { IsString, IsInt, MinLength, IsEmail } from 'class-validator';

export class ChatDto {
  @IsString()
  prompt: string;

}
