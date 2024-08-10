import { $Enums } from '@prisma/client';
import { IsString, IsInt, MinLength, IsEmail, IsOptional, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';

class TaskData {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsDateString()
  time: Date;

  @IsString()
  @IsOptional()
  note?: string;
}

class UpdateTaskData {
  @IsString()
  title?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsDateString()
  time?: Date;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateTaskDto {
  data: TaskData;

  @IsArray()
  @IsEnum($Enums.Categories, { each: true })
  @IsOptional()
  category: $Enums.Categories[];
}

export class UpdateTaskDto {
  data: UpdateTaskData;

  @IsArray()
  @IsEnum($Enums.Categories, { each: true })
  @IsOptional()
  category: $Enums.Categories[];
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

