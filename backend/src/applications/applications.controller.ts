import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, ReviewApplicationDto } from './dto';
import { RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '@prisma/client';

@Controller('applications')
@UseGuards(RolesGuard)
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    /**
     * Get available rooms (public for tenants to browse)
     */
    @Get('rooms/available')
    @Roles(UserRole.TENANT)
    getAvailableRooms() {
        return this.applicationsService.getAvailableRooms();
    }

    /**
     * Tenant applies to a room
     */
    @Post()
    @Roles(UserRole.TENANT)
    apply(
        @CurrentUser('id') userId: string,
        @Body() createDto: CreateApplicationDto,
    ) {
        return this.applicationsService.apply(userId, createDto);
    }

    /**
     * Get tenant's own applications
     */
    @Get('my-applications')
    @Roles(UserRole.TENANT)
    getMyApplications(@CurrentUser('id') userId: string) {
        return this.applicationsService.getMyApplications(userId);
    }

    /**
     * Withdraw an application
     */
    @Patch(':id/withdraw')
    @Roles(UserRole.TENANT)
    withdraw(
        @CurrentUser('id') userId: string,
        @Param('id') applicationId: string,
    ) {
        return this.applicationsService.withdraw(userId, applicationId);
    }

    /**
     * Get applications for owner's properties
     */
    @Get('for-owner')
    @Roles(UserRole.OWNER)
    getApplicationsForOwner(@CurrentUser('id') ownerId: string) {
        return this.applicationsService.getApplicationsForOwner(ownerId);
    }

    /**
     * Review (approve/reject) an application
     */
    @Patch(':id/review')
    @Roles(UserRole.OWNER)
    review(
        @CurrentUser('id') ownerId: string,
        @Param('id') applicationId: string,
        @Body() reviewDto: ReviewApplicationDto,
    ) {
        return this.applicationsService.review(ownerId, applicationId, reviewDto);
    }
}
