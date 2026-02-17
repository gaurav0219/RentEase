import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantProfileDto, ApproveTenantDto } from './dto';
import { TenantStatus, UserRole } from '@prisma/client';

@Injectable()
export class TenantsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Helper: Get all property IDs owned by a specific owner
     */
    private async getOwnerPropertyIds(ownerId: string): Promise<string[]> {
        const properties = await this.prisma.property.findMany({
            where: { ownerId, isActive: true },
            select: { id: true },
        });
        return properties.map(p => p.id);
    }

    /**
     * Helper: Get all room IDs for owner's properties
     */
    private async getOwnerRoomIds(ownerId: string): Promise<string[]> {
        const propertyIds = await this.getOwnerPropertyIds(ownerId);
        const rooms = await this.prisma.room.findMany({
            where: { propertyId: { in: propertyIds }, isActive: true },
            select: { id: true },
        });
        return rooms.map(r => r.id);
    }

    /**
     * Helper: Check if a tenant is associated with owner's properties
     * (either assigned to a room, has an agreement, OR has a pending application)
     */
    private async isTenantAssociatedWithOwner(tenantId: string, ownerId: string): Promise<boolean> {
        const roomIds = await this.getOwnerRoomIds(ownerId);

        if (roomIds.length === 0) return false;

        // Check if tenant is currently assigned to one of owner's rooms
        const tenantWithRoom = await this.prisma.tenant.findFirst({
            where: {
                id: tenantId,
                currentRoom: {
                    propertyId: { in: await this.getOwnerPropertyIds(ownerId) },
                },
            },
        });
        if (tenantWithRoom) return true;

        // Check if tenant has any agreement with owner's rooms
        const agreementWithOwner = await this.prisma.agreement.findFirst({
            where: {
                tenantId,
                roomId: { in: roomIds },
            },
        });
        if (agreementWithOwner) return true;

        // Check if tenant has pending or approved application to owner's rooms
        const applicationWithOwner = await this.prisma.tenantApplication.findFirst({
            where: {
                tenantId,
                roomId: { in: roomIds },
                status: { in: ['PENDING', 'APPROVED'] },
            },
        });
        if (applicationWithOwner) return true;

        return false;
    }

    async getProfile(userId: string) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                documents: {
                    select: {
                        id: true,
                        type: true,
                        originalName: true,
                        isVerified: true,
                        createdAt: true,
                    },
                },
                currentRoom: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                city: true,
                                state: true,
                            },
                        },
                    },
                },
            },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant profile not found');
        }

        return tenant;
    }

    async updateProfile(userId: string, updateDto: UpdateTenantProfileDto) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant profile not found');
        }

        const updated = await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: updateDto,
            include: {
                user: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                documents: true,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                entityType: 'Tenant',
                entityId: tenant.id,
                details: { ...updateDto },
            },
        });

        return updated;
    }

    /**
     * Get tenants associated with owner's properties ONLY
     * Security: Owners can only see tenants assigned to their rooms 
     * or who have agreements with their properties
     */
    async findAll(ownerId: string, status?: TenantStatus) {
        // Get owner's property IDs first
        const propertyIds = await this.getOwnerPropertyIds(ownerId);

        if (propertyIds.length === 0) {
            // Owner has no properties, return empty array
            return [];
        }

        // Get room IDs for owner's properties
        const roomIds = await this.getOwnerRoomIds(ownerId);

        // Find tenants who are either:
        // 1. Currently assigned to owner's rooms
        // 2. Have agreements with owner's rooms
        // 3. Have pending applications to owner's rooms
        const tenantIdsWithAgreements = await this.prisma.agreement.findMany({
            where: { roomId: { in: roomIds } },
            select: { tenantId: true },
            distinct: ['tenantId'],
        });
        const tenantIdsFromAgreements = tenantIdsWithAgreements.map(a => a.tenantId);

        const tenantsAssignedToRooms = await this.prisma.tenant.findMany({
            where: {
                currentRoom: {
                    propertyId: { in: propertyIds },
                },
            },
            select: { id: true },
        });
        const tenantIdsFromRooms = tenantsAssignedToRooms.map(t => t.id);

        // Include tenants with PENDING or APPROVED applications
        const tenantsWithApplications = await this.prisma.tenantApplication.findMany({
            where: {
                roomId: { in: roomIds },
                status: { in: ['PENDING', 'APPROVED'] },  // Include approved tenants too!
            },
            select: { tenantId: true },
            distinct: ['tenantId'],
        });
        const tenantIdsFromApplications = tenantsWithApplications.map(a => a.tenantId);

        // Combine unique tenant IDs
        const allTenantIds = [...new Set([
            ...tenantIdsFromAgreements,
            ...tenantIdsFromRooms,
            ...tenantIdsFromApplications,
        ])];

        if (allTenantIds.length === 0) {
            return [];
        }

        // Build query with proper filtering
        const whereClause: any = {
            id: { in: allTenantIds },
        };

        if (status) {
            whereClause.status = status;
        }

        const tenants = await this.prisma.tenant.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        firstName: true,
                        lastName: true,
                        isActive: true,
                    },
                },
                documents: {
                    select: {
                        id: true,
                        type: true,
                        originalName: true,
                        isVerified: true,
                    },
                },
                currentRoom: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                ownerId: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return tenants;
    }

    /**
     * Get a single tenant's details
     * Security: Only if tenant is associated with owner's properties
     */
    async findOne(tenantId: string, ownerId: string) {
        // First verify ownership
        const isAssociated = await this.isTenantAssociatedWithOwner(tenantId, ownerId);
        if (!isAssociated) {
            throw new ForbiddenException('You do not have access to this tenant');
        }

        const tenant = await this.prisma.tenant.findFirst({
            where: { id: tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                documents: true,
                currentRoom: {
                    include: {
                        property: true,
                    },
                },
                agreements: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return tenant;
    }

    /**
     * Approve or reject a tenant
     * Security: Only if tenant is associated with owner's properties
     */
    async approve(tenantId: string, ownerId: string, approveDto: ApproveTenantDto) {
        // First verify ownership - tenant must have an agreement with owner's property
        const isAssociated = await this.isTenantAssociatedWithOwner(tenantId, ownerId);
        if (!isAssociated) {
            throw new ForbiddenException('You do not have permission to approve/reject this tenant');
        }

        const tenant = await this.prisma.tenant.findFirst({
            where: { id: tenantId, status: TenantStatus.PENDING },
            include: { user: true },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found or not in pending status');
        }

        const updateData: any = {
            status: approveDto.status,
        };

        if (approveDto.status === TenantStatus.APPROVED) {
            updateData.approvedAt = new Date();
        } else if (approveDto.status === TenantStatus.REJECTED) {
            if (!approveDto.rejectionReason) {
                throw new BadRequestException('Rejection reason is required');
            }
            updateData.rejectedAt = new Date();
            updateData.rejectionReason = approveDto.rejectionReason;
        }

        const updated = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: updateData,
            include: {
                user: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        // Create notification for tenant
        await this.prisma.notification.create({
            data: {
                userId: tenant.userId,
                type: 'EMAIL',
                subject: approveDto.status === TenantStatus.APPROVED
                    ? 'Your tenant application has been approved!'
                    : 'Your tenant application status update',
                message: approveDto.status === TenantStatus.APPROVED
                    ? 'Congratulations! Your application has been approved. You can now be assigned to a room.'
                    : `Your application has been rejected. Reason: ${approveDto.rejectionReason}`,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: approveDto.status === TenantStatus.APPROVED ? 'APPROVE' : 'REJECT',
                entityType: 'Tenant',
                entityId: tenantId,
                details: { status: approveDto.status, reason: approveDto.rejectionReason },
            },
        });

        return updated;
    }

    async getAgreements(userId: string) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return this.prisma.agreement.findMany({
            where: { tenantId: tenant.id },
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
            orderBy: { createdAt: 'desc' },
        });
    }
}
