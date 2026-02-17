import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @IsEnum(PropertyType)
    type: PropertyType;

    @IsString()
    @MinLength(5)
    address: string;

    @IsString()
    @MinLength(2)
    city: string;

    @IsString()
    @MinLength(2)
    state: string;

    @IsString()
    @MinLength(6)
    @MaxLength(6)
    pincode: string;

    @IsOptional()
    @IsString()
    landmark?: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdatePropertyDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsEnum(PropertyType)
    type?: PropertyType;

    @IsOptional()
    @IsString()
    @MinLength(5)
    address?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    city?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    state?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    @MaxLength(6)
    pincode?: string;

    @IsOptional()
    @IsString()
    landmark?: string;

    @IsOptional()
    @IsString()
    description?: string;
}
