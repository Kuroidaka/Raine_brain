import { $Enums } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsArray, IsDecimal } from 'class-validator';


export class UpdateCalendarDto {

    @IsOptional()
    @IsString()
    summary?: string

    @IsOptional()
    @IsString()
    colorId?: string | null

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsString()
    timeZone?: string

    @IsString()
    startDateTime: string

    @IsString()
    endDateTime: string
}


export class CreateCalendarDto {

    @IsOptional()
    @IsString()
    summary: string

    @IsOptional()
    @IsString()
    colorId?: string | null

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsString()
    timeZone?: string

    @IsString()
    startDateTime: string

    @IsString()
    endDateTime: string
}