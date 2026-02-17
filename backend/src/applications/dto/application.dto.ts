import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateApplicationDto {
    @IsUUID()
    roomId: string;

    @IsOptional()
    @IsString()
    message?: string;
}

export class ReviewApplicationDto {
    @IsString()
    status: 'APPROVED' | 'REJECTED';

    @IsOptional()
    @IsString()
    reviewNotes?: string;
}
