import { IsString, IsInt, MinLength, IsEmail, IsOptional } from 'class-validator';

export class ChatDto {
  @IsString()
  prompt: string;

  @IsString()
  @IsOptional()
  conversationID: string;

}
