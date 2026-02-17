import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, AssignTenantDto } from './dto';
import { RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '@prisma/client';

@Controller('rooms')
@UseGuards(RolesGuard)
@Roles(UserRole.OWNER)
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) { }

    @Post()
    create(
        @CurrentUser('id') userId: string,
        @Body() createRoomDto: CreateRoomDto,
    ) {
        return this.roomsService.create(userId, createRoomDto);
    }

    @Get()
    findByProperty(
        @Query('propertyId') propertyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.roomsService.findByProperty(propertyId, userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
        return this.roomsService.findOne(id, userId);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Body() updateRoomDto: UpdateRoomDto,
    ) {
        return this.roomsService.update(id, userId, updateRoomDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
        return this.roomsService.remove(id, userId);
    }

    @Post(':id/assign-tenant')
    assignTenant(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Body() assignTenantDto: AssignTenantDto,
    ) {
        return this.roomsService.assignTenant(id, userId, assignTenantDto);
    }

    @Post(':id/remove-tenant')
    removeTenant(@Param('id') id: string, @CurrentUser('id') userId: string) {
        return this.roomsService.removeTenant(id, userId);
    }
}
