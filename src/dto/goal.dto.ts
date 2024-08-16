import { $Enums } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsArray, IsDecimal } from 'class-validator';

class GoalData {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDecimal()
  percent: number;
}

class UpdateGoalData {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDecimal()
  @IsOptional()
  percent?: number;
}

export class CreateGoalDto {
  data: GoalData;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area: $Enums.Areas[];
}

export class UpdateGoalDto {
  data: UpdateGoalData;

  @IsArray()
  @IsEnum($Enums.Areas, { each: true })
  @IsOptional()
  area: $Enums.Areas[];
}
