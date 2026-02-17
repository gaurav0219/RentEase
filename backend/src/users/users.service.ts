import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangePasswordDto, UpdateSettingsDto } from './dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if phone is already taken by another user
        if (updateProfileDto.phone) {
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    phone: updateProfileDto.phone,
                    id: { not: userId },
                },
            });
            if (existingUser) {
                throw new BadRequestException('Phone number is already in use');
            }
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: updateProfileDto,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                entityType: 'User',
                entityId: userId,
                details: { updated: Object.keys(updateProfileDto) },
            },
        });

        return updatedUser;
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        const { currentPassword, newPassword } = changePasswordDto;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                entityType: 'User',
                entityId: userId,
                details: { action: 'Password changed' },
            },
        });

        return { message: 'Password updated successfully' };
    }

    async deleteAccount(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenant: {
                    include: {
                        currentRoom: true,
                        agreements: {
                            where: {
                                status: { in: ['DRAFT', 'ACTIVE', 'PENDING_SIGNATURE'] },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if tenant has active room assignment
        if (user.tenant?.currentRoom) {
            throw new BadRequestException('Cannot delete account while assigned to a room. Please contact your landlord first.');
        }

        // Check if tenant has active or pending agreements
        if (user.tenant?.agreements && user.tenant.agreements.length > 0) {
            throw new BadRequestException(
                'Cannot delete account with active agreements. Please wait for your agreement to end or contact your landlord for early termination.'
            );
        }

        // Soft delete - deactivate the account and update tenant status
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { isActive: false },
            }),
            // If user is a tenant, mark them as inactive
            ...(user.tenant ? [
                this.prisma.tenant.update({
                    where: { id: user.tenant.id },
                    data: { status: 'INACTIVE' },
                }),
            ] : []),
        ]);

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'DELETE',
                entityType: 'User',
                entityId: userId,
                details: { action: 'Account deactivated' },
            },
        });

        return { message: 'Account deleted successfully' };
    }

    async getSettings(userId: string) {
        // First check if settings exist, if not create default
        let settings = await this.prisma.userSettings.findUnique({
            where: { userId },
        });

        if (!settings) {
            settings = await this.prisma.userSettings.create({
                data: {
                    userId,
                    emailRentReminders: true,
                    emailAgreementUpdates: true,
                    emailTenantApplications: true,
                    emailDocumentVerification: false,
                    smsNotifications: false,
                    whatsappNotifications: false,
                    language: 'en',
                    dateFormat: 'dd/mm/yyyy',
                    theme: 'dark',
                },
            });
        }

        return settings;
    }

    async updateSettings(userId: string, updateSettingsDto: UpdateSettingsDto) {
        // Upsert settings
        const settings = await this.prisma.userSettings.upsert({
            where: { userId },
            update: updateSettingsDto,
            create: {
                userId,
                emailRentReminders: updateSettingsDto.emailRentReminders ?? true,
                emailAgreementUpdates: updateSettingsDto.emailAgreementUpdates ?? true,
                emailTenantApplications: updateSettingsDto.emailTenantApplications ?? true,
                emailDocumentVerification: updateSettingsDto.emailDocumentVerification ?? false,
                smsNotifications: updateSettingsDto.smsNotifications ?? false,
                whatsappNotifications: updateSettingsDto.whatsappNotifications ?? false,
                language: updateSettingsDto.language ?? 'en',
                dateFormat: updateSettingsDto.dateFormat ?? 'dd/mm/yyyy',
                theme: updateSettingsDto.theme ?? 'dark',
            },
        });

        return settings;
    }
}
