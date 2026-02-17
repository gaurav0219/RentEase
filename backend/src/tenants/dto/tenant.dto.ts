import { IsString, IsOptional, IsDateString, IsInt, Min, MinLength, MaxLength, Matches, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTenantProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    fatherName?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    motherName?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    @MinLength(10)
    permanentAddress?: string;

    @IsOptional()
    @IsString()
    profession?: string;

    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsString()
    @Matches(/^[6-9]\d{9}$/, { message: 'Please enter a valid Indian mobile number' })
    emergencyContact?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    emergencyContactName?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    numberOfOccupants?: number;
}

export class ApproveTenantDto {
    @IsIn(['APPROVED', 'REJECTED'])
    status: 'APPROVED' | 'REJECTED';

    @IsOptional()
    @IsString()
    @MaxLength(500)
    rejectionReason?: string;
}
