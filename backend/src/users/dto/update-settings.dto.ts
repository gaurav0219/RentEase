import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsBoolean()
    emailRentReminders?: boolean;

    @IsOptional()
    @IsBoolean()
    emailAgreementUpdates?: boolean;

    @IsOptional()
    @IsBoolean()
    emailTenantApplications?: boolean;

    @IsOptional()
    @IsBoolean()
    emailDocumentVerification?: boolean;

    @IsOptional()
    @IsBoolean()
    smsNotifications?: boolean;

    @IsOptional()
    @IsBoolean()
    whatsappNotifications?: boolean;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsString()
    dateFormat?: string;

    @IsOptional()
    @IsString()
    theme?: string;
}
