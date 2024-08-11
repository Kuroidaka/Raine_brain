import { $Enums } from '@prisma/client';
import { IsString, IsInt, MinLength, IsEmail, IsOptional, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';

class TaskData {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsDateString()
  deadline: Date | string | null;

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
  deadline?: Date | string | null;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateTaskDto {
  data: TaskData;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area: $Enums.Areas[];
}

export class UpdateTaskDto {
  data: UpdateTaskData;

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

