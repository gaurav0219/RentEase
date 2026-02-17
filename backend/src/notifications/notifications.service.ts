import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a notification for a user, respecting their notification settings.
     * settingKey maps to UserSettings fields so we can check if the user wants this type.
     */
    async create(
        userId: string,
        subject: string,
        message: string,
        type: NotificationType = NotificationType.EMAIL,
        settingKey?: string,
    ) {
        // If a settingKey is provided, check if the user has that notification enabled
        if (settingKey) {
            const settings = await this.prisma.userSettings.findUnique({
                where: { userId },
            });
            if (settings && settings[settingKey] === false) {
                // User has disabled this notification type — skip
                return null;
            }
        }

        return this.prisma.notification.create({
            data: {
                userId,
                subject,
                message,
                type,
                isSent: true,
                sentAt: new Date(),
            },
        });
    }

    /**
     * Get all notifications for a user, newest first.
     */
    async findAll(userId: string, limit = 50) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get the count of unread notifications.
     */
    async getUnreadCount(userId: string): Promise<number> {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }

    /**
     * Mark a single notification as read.
     */
    async markAsRead(id: string, userId: string) {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true, readAt: new Date() },
        });
    }

    /**
     * Mark all notifications as read for a user.
     */
    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }

    /**
     * Delete a notification.
     */
    async delete(id: string, userId: string) {
        return this.prisma.notification.deleteMany({
            where: { id, userId },
        });
    }
}
