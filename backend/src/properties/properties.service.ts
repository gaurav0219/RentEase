import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class PropertiesService {
    constructor(private prisma: PrismaService) { }

    async create(ownerId: string, createPropertyDto: CreatePropertyDto) {
        const property = await this.prisma.property.create({
            data: {
                ...createPropertyDto,
                ownerId,
            },
            include: {
                rooms: true,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'CREATE',
                entityType: 'Property',
                entityId: property.id,
                details: { name: property.name },
            },
        });

        return property;
    }

    async findAll(userId: string, role: UserRole) {
        if (role === UserRole.OWNER) {
            return this.prisma.property.findMany({
                where: { ownerId: userId, isActive: true },
                include: {
                    rooms: {
                        where: { isActive: true },
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
                    },
                    _count: {
                        select: { rooms: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }

        // Tenants can only see properties they're renting
        return this.prisma.property.findMany({
            where: {
                rooms: {
                    some: {
                        currentTenant: {
                            userId,
                        },
                    },
                },
                isActive: true,
            },
            include: {
                rooms: {
                    where: {
                        isActive: true,
                        currentTenant: {
                            userId,
                        },
                    },
                },
            },
        });
    }

    async findOne(id: string, userId: string, role: UserRole) {
        const property = await this.prisma.property.findFirst({
            where: { id, isActive: true },
            include: {
                rooms: {
                    where: { isActive: true },
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
                },
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        // Check access
        if (role === UserRole.OWNER && property.ownerId !== userId) {
            throw new ForbiddenException('You do not have access to this property');
        }

        if (role === UserRole.TENANT) {
            const hasTenantAccess = property.rooms.some(
                (room) => room.currentTenant?.userId === userId,
            );
            if (!hasTenantAccess) {
                throw new ForbiddenException('You do not have access to this property');
            }
        }

        return property;
    }

    async update(id: string, userId: string, updatePropertyDto: UpdatePropertyDto) {
        const property = await this.prisma.property.findFirst({
            where: { id, ownerId: userId, isActive: true },
        });

        if (!property) {
            throw new NotFoundException('Property not found or you do not have permission');
        }

        const updated = await this.prisma.property.update({
            where: { id },
            data: updatePropertyDto,
            include: {
                rooms: { where: { isActive: true } },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                entityType: 'Property',
                entityId: id,
                details: { ...updatePropertyDto },
            },
        });

        return updated;
    }

    async remove(id: string, userId: string) {
        const property = await this.prisma.property.findFirst({
            where: { id, ownerId: userId, isActive: true },
        });

        if (!property) {
            throw new NotFoundException('Property not found or you do not have permission');
        }

        // Soft delete
        await this.prisma.property.update({
            where: { id },
            data: { isActive: false },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'DELETE',
                entityType: 'Property',
                entityId: id,
                details: { name: property.name },
            },
        });

        return { message: 'Property deleted successfully' };
    }

    async getStats(userId: string) {
        const properties = await this.prisma.property.findMany({
            where: { ownerId: userId, isActive: true },
            include: {
                rooms: {
                    where: { isActive: true }, // Only include active (non-deleted) rooms
                    include: {
                        currentTenant: true,
                    },
                },
            },
        });

        const totalProperties = properties.length;
        let totalRooms = 0;
        let occupiedRooms = 0;
        let totalMonthlyRent = 0;

        for (const property of properties) {
            totalRooms += property.rooms.length;
            for (const room of property.rooms) {
                if (room.currentTenantId) {
                    occupiedRooms++;
                    totalMonthlyRent += Number(room.rentAmount);
                }
            }
        }

        return {
            totalProperties,
            totalRooms,
            occupiedRooms,
            vacantRooms: totalRooms - occupiedRooms,
            occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
            totalMonthlyRent,
        };
    }
}
