import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto, AssignTenantDto } from './dto';
import { RoomStatus, TenantStatus } from '@prisma/client';

@Injectable()
export class RoomsService {
    constructor(private prisma: PrismaService) { }

    async create(ownerId: string, createRoomDto: CreateRoomDto) {
        // Verify property ownership
        const property = await this.prisma.property.findFirst({
            where: { id: createRoomDto.propertyId, ownerId, isActive: true },
        });

        if (!property) {
            throw new ForbiddenException('Property not found or you do not have permission');
        }

        // Check if a soft-deleted room with same number exists - reactivate it
        const existingRoom = await this.prisma.room.findFirst({
            where: {
                propertyId: createRoomDto.propertyId,
                roomNumber: createRoomDto.roomNumber,
                isActive: false,
            },
        });

        let room;
        if (existingRoom) {
            // Reactivate the soft-deleted room with new data
            room = await this.prisma.room.update({
                where: { id: existingRoom.id },
                data: {
                    ...createRoomDto,
                    isActive: true,
                    status: 'AVAILABLE',
                    currentTenantId: null,
                },
                include: {
                    property: true,
                },
            });
        } else {
            room = await this.prisma.room.create({
                data: {
                    ...createRoomDto,
                },
                include: {
                    property: true,
                },
            });
        }

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'CREATE',
                entityType: 'Room',
                entityId: room.id,
                details: { roomNumber: room.roomNumber, propertyId: room.propertyId },
            },
        });

        return room;
    }

    async findByProperty(propertyId: string, ownerId: string) {
        // Verify property ownership
        const property = await this.prisma.property.findFirst({
            where: { id: propertyId, ownerId, isActive: true },
        });

        if (!property) {
            throw new ForbiddenException('Property not found or you do not have permission');
        }

        return this.prisma.room.findMany({
            where: { propertyId, isActive: true },
            include: {
                currentTenant: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        });
    }

    async findOne(id: string, ownerId: string) {
        const room = await this.prisma.room.findFirst({
            where: { id, isActive: true },
            include: {
                property: true,
                currentTenant: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                        documents: true,
                    },
                },
                agreements: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        if (room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have access to this room');
        }

        return room;
    }

    async update(id: string, ownerId: string, updateRoomDto: UpdateRoomDto) {
        const room = await this.prisma.room.findFirst({
            where: { id, isActive: true },
            include: { property: true },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        if (room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission to update this room');
        }

        const updated = await this.prisma.room.update({
            where: { id },
            data: updateRoomDto,
            include: {
                property: true,
                currentTenant: true,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'UPDATE',
                entityType: 'Room',
                entityId: id,
                details: { ...updateRoomDto },
            },
        });

        return updated;
    }

    async remove(id: string, ownerId: string) {
        const room = await this.prisma.room.findFirst({
            where: { id, isActive: true },
            include: { property: true },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        if (room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission to delete this room');
        }

        if (room.currentTenantId) {
            throw new BadRequestException('Cannot delete room with active tenant');
        }

        await this.prisma.room.update({
            where: { id },
            data: { isActive: false },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'DELETE',
                entityType: 'Room',
                entityId: id,
                details: { roomNumber: room.roomNumber },
            },
        });

        return { message: 'Room deleted successfully' };
    }

    async assignTenant(roomId: string, ownerId: string, assignTenantDto: AssignTenantDto) {
        const room = await this.prisma.room.findFirst({
            where: { id: roomId, isActive: true },
            include: { property: true },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        if (room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission');
        }

        if (room.currentTenantId) {
            throw new BadRequestException('Room already has a tenant assigned');
        }

        // Verify tenant exists and is approved
        const tenant = await this.prisma.tenant.findFirst({
            where: { id: assignTenantDto.tenantId, status: TenantStatus.APPROVED },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found or not approved');
        }

        // Check if tenant is already assigned to another room
        const existingRoom = await this.prisma.room.findFirst({
            where: { currentTenantId: tenant.id },
        });

        if (existingRoom) {
            throw new BadRequestException('Tenant is already assigned to another room');
        }

        const updated = await this.prisma.room.update({
            where: { id: roomId },
            data: {
                currentTenantId: tenant.id,
                status: RoomStatus.OCCUPIED,
            },
            include: {
                currentTenant: {
                    include: { user: true },
                },
            },
        });

        // Update tenant status to active
        await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: TenantStatus.ACTIVE },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'ASSIGN_TENANT',
                entityType: 'Room',
                entityId: roomId,
                details: { tenantId: tenant.id },
            },
        });

        return updated;
    }

    async removeTenant(roomId: string, ownerId: string) {
        const room = await this.prisma.room.findFirst({
            where: { id: roomId, isActive: true },
            include: { property: true, currentTenant: true },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        if (room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission');
        }

        if (!room.currentTenantId) {
            throw new BadRequestException('Room has no tenant assigned');
        }

        const tenantId = room.currentTenantId;

        await this.prisma.room.update({
            where: { id: roomId },
            data: {
                currentTenantId: null,
                status: RoomStatus.AVAILABLE,
            },
        });

        // Update tenant status
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { status: TenantStatus.INACTIVE },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'REMOVE_TENANT',
                entityType: 'Room',
                entityId: roomId,
                details: { tenantId },
            },
        });

        return { message: 'Tenant removed successfully' };
    }
}
