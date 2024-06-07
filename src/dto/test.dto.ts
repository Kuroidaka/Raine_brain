import { IsString, IsInt, MinLength, IsEmail } from 'class-validator';

export class TestDto {
  @IsString()
  user_input: string;

}
