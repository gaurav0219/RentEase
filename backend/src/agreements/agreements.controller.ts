import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Res,
    Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto, UpdateAgreementDto } from './dto';
import { RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole, AgreementStatus } from '@prisma/client';

@Controller('agreements')
@UseGuards(RolesGuard)
export class AgreementsController {
    constructor(private readonly agreementsService: AgreementsService) { }

    @Post()
    @Roles(UserRole.OWNER)
    create(
        @CurrentUser('id') userId: string,
        @Body() createAgreementDto: CreateAgreementDto,
    ) {
        return this.agreementsService.create(userId, createAgreementDto);
    }

    @Get()
    @Roles(UserRole.OWNER, UserRole.TENANT)
    findAll(
        @CurrentUser('id') userId: string,
        @CurrentUser('role') userRole: string,
    ) {
        return this.agreementsService.findAll(userId, userRole);
    }

    @Get(':id')
    @Roles(UserRole.OWNER, UserRole.TENANT)
    findOne(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('role') userRole: string,
    ) {
        return this.agreementsService.findOne(id, userId, userRole);
    }

    @Get(':id/download')
    async download(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Res() res: Response,
    ) {
        const file = await this.agreementsService.downloadPdf(id, userId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
        res.send(file.buffer);
    }

    @Patch(':id/status')
    @Roles(UserRole.OWNER)
    updateStatus(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Query('status') status: AgreementStatus,
    ) {
        return this.agreementsService.updateStatus(id, userId, status);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER)
    update(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Body() updateAgreementDto: UpdateAgreementDto,
    ) {
        return this.agreementsService.update(id, userId, updateAgreementDto);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER)
    delete(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.agreementsService.delete(id, userId);
    }
}
