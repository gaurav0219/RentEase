import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import { RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '@prisma/client';

@Controller('properties')
@UseGuards(RolesGuard)
export class PropertiesController {
    constructor(private readonly propertiesService: PropertiesService) { }

    @Post()
    @Roles(UserRole.OWNER)
    create(
        @CurrentUser('id') userId: string,
        @Body() createPropertyDto: CreatePropertyDto,
    ) {
        return this.propertiesService.create(userId, createPropertyDto);
    }

    @Get()
    findAll(
        @CurrentUser('id') userId: string,
        @CurrentUser('role') role: UserRole,
    ) {
        return this.propertiesService.findAll(userId, role);
    }

    @Get('stats')
    @Roles(UserRole.OWNER)
    getStats(@CurrentUser('id') userId: string) {
        return this.propertiesService.getStats(userId);
    }

    @Get(':id')
    findOne(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('role') role: UserRole,
    ) {
        return this.propertiesService.findOne(id, userId, role);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER)
    update(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Body() updatePropertyDto: UpdatePropertyDto,
    ) {
        return this.propertiesService.update(id, userId, updatePropertyDto);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER)
    remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
        return this.propertiesService.remove(id, userId);
    }
}
