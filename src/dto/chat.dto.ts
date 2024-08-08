import { IsString, IsInt, MinLength, IsEmail, IsOptional } from 'class-validator';

export class ChatDto {
  @IsString()
  prompt: string;

  @IsString()
  @IsOptional()
  conversationID: string;

  @IsString()
  @IsOptional()
  imgURL?: string;

  @IsString()
  @IsOptional()
  base64Data?: string;
  
}
