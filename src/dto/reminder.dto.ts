import { $Enums } from '@prisma/client';
import { IsString, IsInt, MinLength, IsEmail, IsOptional, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  deadline: string | null;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area: $Enums.Areas[];
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  deadline?: string | null;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area: $Enums.Areas[];
}

export class SubTaskCreateDto {
  @IsString()
  title: string
}
export class SubTaskUpdateDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsBoolean()
  @IsOptional()
  status?:boolean
}

