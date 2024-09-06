import { $Enums } from '@prisma/client';
import { IsString, IsOptional, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { UpdateRoutineDateProps } from '~/database/reminder/routine.type';

export class CreateRoutineDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  routineTime: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area: $Enums.Areas[];
}

export class UpdateRoutineDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  routineTime?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area?: $Enums.Areas[];


  @IsArray()
  @IsOptional()
  dates?: UpdateRoutineDateProps[];

}


export class UpdateRoutineDatesDto {

  @IsArray()
  dates: UpdateRoutineDateProps[];

}