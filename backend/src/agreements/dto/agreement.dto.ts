import { IsUUID, IsDateString, IsNumber, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgreementDto {
    @IsUUID()
    roomId: string;

    @IsUUID()
    tenantId: string;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    monthlyRent: number;

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
    @IsInt()
    @Min(1)
    @Max(28)
    @Type(() => Number)
    rentDueDay?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(24)
    @Type(() => Number)
    lockInPeriodMonths?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(90)
    @Type(() => Number)
    noticePeriodDays?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    rentEscalation?: number;

    @IsString()
    jurisdiction: string;

    @IsOptional()
    additionalClauses?: Record<string, string>;
}

export class UpdateAgreementDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    monthlyRent?: number;

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
    @IsInt()
    @Min(1)
    @Max(28)
    @Type(() => Number)
    rentDueDay?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(24)
    @Type(() => Number)
    lockInPeriodMonths?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(90)
    @Type(() => Number)
    noticePeriodDays?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    rentEscalation?: number;

    @IsOptional()
    @IsString()
    jurisdiction?: string;

    @IsOptional()
    additionalClauses?: Record<string, string>;
}
