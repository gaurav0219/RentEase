import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto, ReviewApplicationDto } from './dto';
import { ApplicationStatus, RoomStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApplicationsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * Get available rooms for tenants to browse and apply to
     * Only shows rooms that are AVAILABLE and active
     */
    async getAvailableRooms() {
        return this.prisma.room.findMany({
            where: {
                status: RoomStatus.AVAILABLE,
                isActive: true,
                property: { isActive: true },
            },
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        type: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Tenant applies to a room
     */
    async apply(userId: string, createDto: CreateApplicationDto) {
        // Get tenant profile
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant profile not found');
        }

        // Check if room exists and is available
        const room = await this.prisma.room.findFirst({
            where: {
                id: createDto.roomId,
                status: RoomStatus.AVAILABLE,
                isActive: true,
            },
            include: { property: true },
        });

        if (!room) {
            throw new NotFoundException('Room not found or not available');
        }

        // Check if tenant already applied to this room
        const existingApplication = await this.prisma.tenantApplication.findFirst({
            where: {
                tenantId: tenant.id,
                roomId: createDto.roomId,
                status: { in: [ApplicationStatus.PENDING] },
            },
        });

        if (existingApplication) {
            throw new ConflictException('You have already applied to this room');
        }

        // Create application
        const application = await this.prisma.tenantApplication.create({
            data: {
                tenantId: tenant.id,
                roomId: createDto.roomId,
                message: createDto.message,
            },
            include: {
                room: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                            },
                        },
                    },
                },
            },
        });

        // Notify property owner (respects emailTenantApplications setting)
        await this.notificationsService.create(
            room.property.ownerId,
            'New Tenant Application',
            `A new tenant has applied for room ${room.roomNumber} in ${room.property.name}`,
            'EMAIL',
            'emailTenantApplications',
        );

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                entityType: 'TenantApplication',
                entityId: application.id,
                details: { roomId: createDto.roomId },
            },
        });

        return application;
    }

    /**
     * Get tenant's own applications
     */
    async getMyApplications(userId: string) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant profile not found');
        }

        return this.prisma.tenantApplication.findMany({
            where: { tenantId: tenant.id },
            include: {
                room: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                city: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Withdraw an application (tenant)
     */
    async withdraw(userId: string, applicationId: string) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant profile not found');
        }

        const application = await this.prisma.tenantApplication.findFirst({
            where: {
                id: applicationId,
                tenantId: tenant.id,
                status: ApplicationStatus.PENDING,
            },
        });

        if (!application) {
            throw new NotFoundException('Application not found or cannot be withdrawn');
        }

        return this.prisma.tenantApplication.update({
            where: { id: applicationId },
            data: { status: ApplicationStatus.WITHDRAWN },
        });
    }

    /**
     * Get applications for owner's properties
     */
    async getApplicationsForOwner(ownerId: string) {
        // Get owner's property IDs
        const properties = await this.prisma.property.findMany({
            where: { ownerId, isActive: true },
            select: { id: true },
        });
        const propertyIds = properties.map(p => p.id);

        if (propertyIds.length === 0) {
            return [];
        }

        // Get applications for rooms in owner's properties
        return this.prisma.tenantApplication.findMany({
            where: {
                room: { propertyId: { in: propertyIds } },
            },
            include: {
                tenant: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                        documents: {
                            select: {
                                id: true,
                                type: true,
                                isVerified: true,
                            },
                        },
                    },
                },
                room: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Review (approve/reject) an application
     */
    async review(ownerId: string, applicationId: string, reviewDto: ReviewApplicationDto) {
        // Get the application with room and property info
        const application = await this.prisma.tenantApplication.findFirst({
            where: { id: applicationId },
            include: {
                room: {
                    include: { property: true },
                },
                tenant: {
                    include: { user: true },
                },
            },
        });

        if (!application) {
            throw new NotFoundException('Application not found');
        }

        // Verify owner owns this property
        if (application.room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission to review this application');
        }

        if (application.status !== ApplicationStatus.PENDING) {
            throw new BadRequestException('This application has already been reviewed');
        }

        const newStatus = reviewDto.status === 'APPROVED'
            ? ApplicationStatus.APPROVED
            : ApplicationStatus.REJECTED;

        // Update application
        const updated = await this.prisma.tenantApplication.update({
            where: { id: applicationId },
            data: {
                status: newStatus,
                reviewedAt: new Date(),
                reviewNotes: reviewDto.reviewNotes,
            },
            include: {
                tenant: {
                    include: { user: true },
                },
                room: {
                    include: { property: true },
                },
            },
        });

        // If approved, update tenant status if still pending
        if (newStatus === ApplicationStatus.APPROVED) {
            await this.prisma.tenant.updateMany({
                where: {
                    id: application.tenantId,
                    status: 'PENDING',
                },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date(),
                },
            });
        }

        // Notify tenant about application result (respects emailTenantApplications setting)
        const notifSubject = newStatus === ApplicationStatus.APPROVED
            ? 'Application Approved! 🎉'
            : 'Application Update';
        const notifMessage = newStatus === ApplicationStatus.APPROVED
            ? `Your application for room ${application.room.roomNumber} in ${application.room.property.name} has been approved!`
            : `Your application for room ${application.room.roomNumber} has been rejected. ${reviewDto.reviewNotes || ''}`;
        await this.notificationsService.create(
            application.tenant.userId,
            notifSubject,
            notifMessage,
            'EMAIL',
            'emailTenantApplications',
        );

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: reviewDto.status === 'APPROVED' ? 'APPROVE' : 'REJECT',
                entityType: 'TenantApplication',
                entityId: applicationId,
                details: { status: newStatus, notes: reviewDto.reviewNotes },
            },
        });

        return updated;
    }
}
