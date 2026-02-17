import { Controller, Get, Patch, Delete, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async findAll(@CurrentUser() user: any, @Query('limit') limit?: string) {
        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        return this.notificationsService.findAll(user.id, parsedLimit);
    }

    @Get('unread-count')
    async getUnreadCount(@CurrentUser() user: any) {
        const count = await this.notificationsService.getUnreadCount(user.id);
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
        await this.notificationsService.markAsRead(id, user.id);
        return { message: 'Notification marked as read' };
    }

    @Patch('read-all')
    async markAllAsRead(@CurrentUser() user: any) {
        await this.notificationsService.markAllAsRead(user.id);
        return { message: 'All notifications marked as read' };
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @CurrentUser() user: any) {
        await this.notificationsService.delete(id, user.id);
        return { message: 'Notification deleted' };
    }
}
