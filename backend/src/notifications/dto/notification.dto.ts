import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
    @IsString()
    subject: string;

    @IsString()
    message: string;

    @IsString()
    @IsOptional()
    type?: string; // EMAIL, SMS, WHATSAPP - defaults to EMAIL
}
