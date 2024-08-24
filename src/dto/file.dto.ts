import { IsString, IsInt, MinLength, IsEmail, IsOptional } from 'class-validator';

export class setBGImgDto {
  @IsString()
  @IsOptional()
  bgId: string | null;
}


