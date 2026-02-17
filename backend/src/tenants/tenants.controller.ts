import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantProfileDto, ApproveTenantDto } from './dto';
import { RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole, TenantStatus } from '@prisma/client';

@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    // Tenant routes
    @Get('profile')
    @Roles(UserRole.TENANT)
    getProfile(@CurrentUser('id') userId: string) {
        return this.tenantsService.getProfile(userId);
    }

    @Patch('profile')
    @Roles(UserRole.TENANT)
    updateProfile(
        @CurrentUser('id') userId: string,
        @Body() updateDto: UpdateTenantProfileDto,
    ) {
        return this.tenantsService.updateProfile(userId, updateDto);
    }

    @Get('my-agreements')
    @Roles(UserRole.TENANT)
    getMyAgreements(@CurrentUser('id') userId: string) {
        return this.tenantsService.getAgreements(userId);
    }

    // Owner routes
    @Get()
    @Roles(UserRole.OWNER)
    findAll(
        @CurrentUser('id') ownerId: string,
        @Query('status') status?: TenantStatus,
    ) {
        return this.tenantsService.findAll(ownerId, status);
    }

    @Get(':id')
    @Roles(UserRole.OWNER)
    findOne(@Param('id') id: string, @CurrentUser('id') ownerId: string) {
        return this.tenantsService.findOne(id, ownerId);
    }

    @Patch(':id/approve')
    @Roles(UserRole.OWNER)
    approve(
        @Param('id') id: string,
        @CurrentUser('id') ownerId: string,
        @Body() approveDto: ApproveTenantDto,
    ) {
        return this.tenantsService.approve(id, ownerId, approveDto);
    }
}
