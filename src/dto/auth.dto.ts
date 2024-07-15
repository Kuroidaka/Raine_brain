import { IsString, IsInt, MinLength, IsEmail, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  display_name?: string;
}

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
