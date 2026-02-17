import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto';
import { RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '@prisma/client';

@Controller('documents')
@UseGuards(RolesGuard)
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post('upload')
    @Roles(UserRole.TENANT)
    @UseInterceptors(FileInterceptor('file'))
    upload(
        @CurrentUser('id') userId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() uploadDto: UploadDocumentDto,
    ) {
        return this.documentsService.upload(userId, file, uploadDto.type);
    }

    @Get('my-documents')
    @Roles(UserRole.TENANT)
    async getMyDocuments(@CurrentUser('id') userId: string) {
        // Tenants get their own documents - no owner verification needed
        return this.documentsService.getMyDocuments(userId);
    }

    @Get('tenant/:tenantId')
    @Roles(UserRole.OWNER)
    findByTenant(@Param('tenantId') tenantId: string, @CurrentUser('id') ownerId: string) {
        // Verify owner has access to this tenant before returning documents
        return this.documentsService.findByTenant(tenantId, ownerId);
    }

    @Get(':id/download')
    async download(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Res() res: Response,
    ) {
        const file = await this.documentsService.getFile(id, userId);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
        res.send(file.buffer);
    }

    @Post(':id/verify')
    @Roles(UserRole.OWNER)
    verify(@Param('id') id: string, @CurrentUser('id') ownerId: string) {
        return this.documentsService.verify(id, ownerId);
    }

    @Post(':id/reject')
    @Roles(UserRole.OWNER)
    reject(@Param('id') id: string, @CurrentUser('id') ownerId: string) {
        return this.documentsService.reject(id, ownerId);
    }

    @Delete(':id')
    @Roles(UserRole.TENANT)
    delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
        return this.documentsService.delete(id, userId);
    }
}
