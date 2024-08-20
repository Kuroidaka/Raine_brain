import { $Enums } from '@prisma/client';
import { IsString, IsOptional, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { UpdateRoutineDateProps } from '~/database/reminder/routine.type';

class RoutineData {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

class UpdateRoutineData {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateRoutineDto {
  data: RoutineData;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area: $Enums.Areas[];
}

export class UpdateRoutineDto {
  data?: UpdateRoutineData;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area?: $Enums.Areas[];


  @IsArray()
  @IsOptional()
  dates?: UpdateRoutineDateProps[];

}
