import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min, IsInt, MinLength, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { FurnishingType, RoomStatus } from '@prisma/client';

export class CreateRoomDto {
    @IsUUID()
    propertyId: string;

    @IsString()
    @MinLength(1)
    @MaxLength(20)
    roomNumber: string;

    @IsInt()
    @Min(0)
    @Type(() => Number)
    floor: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    rentAmount: number;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    securityDeposit: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    maintenanceCharge?: number;

    @IsOptional()
    @IsEnum(FurnishingType)
    furnishing?: FurnishingType;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[];
}

export class UpdateRoomDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    roomNumber?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    floor?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    rentAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    securityDeposit?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    maintenanceCharge?: number;

    @IsOptional()
    @IsEnum(FurnishingType)
    furnishing?: FurnishingType;

    @IsOptional()
    @IsEnum(RoomStatus)
    status?: RoomStatus;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[];
}

export class AssignTenantDto {
    @IsUUID()
    tenantId: string;
}
