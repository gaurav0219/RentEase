import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DocumentsService {
    private uploadDir: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private notificationsService: NotificationsService,
    ) {
        this.uploadDir = this.configService.get('UPLOAD_DIR') || './uploads';
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Helper: Check if a tenant is associated with owner's properties
     * (either assigned to a room, has an agreement, or has a pending/approved application)
     */
    private async isTenantAssociatedWithOwner(tenantId: string, ownerId: string): Promise<boolean> {
        // Get owner's property IDs
        const properties = await this.prisma.property.findMany({
            where: { ownerId, isActive: true },
            select: { id: true },
        });
        const propertyIds = properties.map(p => p.id);

        if (propertyIds.length === 0) return false;

        // Get room IDs for owner's properties
        const rooms = await this.prisma.room.findMany({
            where: { propertyId: { in: propertyIds }, isActive: true },
            select: { id: true },
        });
        const roomIds = rooms.map(r => r.id);

        // Check if tenant is currently assigned to one of owner's rooms
        const tenantWithRoom = await this.prisma.tenant.findFirst({
            where: {
                id: tenantId,
                currentRoom: {
                    propertyId: { in: propertyIds },
                },
            },
        });
        if (tenantWithRoom) return true;

        // Check if tenant has any agreement with owner's rooms
        if (roomIds.length > 0) {
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
        }

        return false;
    }

    async upload(
        userId: string,
        file: Express.Multer.File,
        type: DocumentType,
    ) {
        // Find tenant
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant profile not found');
        }

        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type. Only JPG, PNG, and PDF are allowed');
        }

        // Validate file size (5MB max)
        const maxSize = this.configService.get('MAX_FILE_SIZE') || 5242880;
        if (file.size > maxSize) {
            throw new BadRequestException('File size exceeds maximum limit of 5MB');
        }

        // Generate unique filename
        const ext = path.extname(file.originalname);
        const fileName = `${uuidv4()}${ext}`;
        const filePath = path.join(this.uploadDir, fileName);

        // Save file
        fs.writeFileSync(filePath, file.buffer);

        // Mask Aadhaar number if applicable
        let maskedData: string | null = null;
        if (type === DocumentType.AADHAAR) {
            // In production, you'd use OCR to extract and mask the number
            maskedData = 'XXXX-XXXX-****';
        }

        // Save to database
        const document = await this.prisma.document.create({
            data: {
                tenantId: tenant.id,
                type,
                fileName,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                path: filePath,
                maskedData,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPLOAD',
                entityType: 'Document',
                entityId: document.id,
                details: { type, originalName: file.originalname },
            },
        });

        return {
            id: document.id,
            type: document.type,
            originalName: document.originalName,
            maskedData: document.maskedData,
            createdAt: document.createdAt,
        };
    }

    /**
     * Get tenant's own documents (for tenant users)
     * No owner verification needed - tenants access their own docs
     */
    async getMyDocuments(userId: string) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { userId },
        });

        if (!tenant) {
            return [];
        }

        return this.prisma.document.findMany({
            where: { tenantId: tenant.id },
            select: {
                id: true,
                type: true,
                originalName: true,
                isVerified: true,
                maskedData: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get documents by tenant ID
     * Security: Only owners who have a relationship with this tenant can access
     */
    async findByTenant(tenantId: string, ownerId: string) {
        // Verify ownership
        const isAssociated = await this.isTenantAssociatedWithOwner(tenantId, ownerId);
        if (!isAssociated) {
            throw new ForbiddenException('You do not have access to this tenant\'s documents');
        }

        return this.prisma.document.findMany({
            where: { tenantId },
            select: {
                id: true,
                type: true,
                originalName: true,
                isVerified: true,
                maskedData: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get file for download
     * Security: Tenant can access own docs, owner can access only associated tenant docs
     */
    async getFile(documentId: string, userId: string) {
        const document = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: {
                tenant: {
                    include: {
                        user: true,
                        currentRoom: {
                            include: {
                                property: true,
                            },
                        },
                    },
                },
            },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // Check access - tenant can only access their own documents
        const requestingUser = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!requestingUser) {
            throw new NotFoundException('User not found');
        }

        const isTenantOwner = document.tenant.userId === userId;
        const isOwnerRole = requestingUser.role === 'OWNER';

        if (isTenantOwner) {
            // Tenant accessing their own document - allowed
        } else if (isOwnerRole) {
            // Owner accessing - must verify relationship
            const isAssociated = await this.isTenantAssociatedWithOwner(document.tenantId, userId);
            if (!isAssociated) {
                throw new ForbiddenException('You do not have access to this document');
            }
        } else {
            throw new ForbiddenException('You do not have access to this document');
        }

        // Read file
        if (!fs.existsSync(document.path)) {
            throw new NotFoundException('File not found on server');
        }

        return {
            buffer: fs.readFileSync(document.path),
            mimeType: document.mimeType,
            fileName: document.originalName,
        };
    }

    /**
     * Verify a document
     * Security: Only owners who have a relationship with the tenant can verify
     */
    async verify(documentId: string, ownerId: string) {
        const document = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: {
                tenant: true,
            },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // Verify ownership
        const isAssociated = await this.isTenantAssociatedWithOwner(document.tenantId, ownerId);
        if (!isAssociated) {
            throw new ForbiddenException('You do not have permission to verify this document');
        }

        const updated = await this.prisma.document.update({
            where: { id: documentId },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'VERIFY',
                entityType: 'Document',
                entityId: documentId,
                details: { type: document.type },
            },
        });

        // Notify tenant that their document was verified
        await this.notificationsService.create(
            document.tenant.userId,
            'Document Verified ✅',
            `Your ${document.type} document has been verified by the property owner.`,
            'EMAIL',
            'emailDocumentVerification',
        );

        return updated;
    }

    /**
     * Reject a document
     * Security: Only owners who have a relationship with the tenant can reject
     */
    async reject(documentId: string, ownerId: string) {
        const document = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: {
                tenant: true,
            },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // Verify ownership
        const isAssociated = await this.isTenantAssociatedWithOwner(document.tenantId, ownerId);
        if (!isAssociated) {
            throw new ForbiddenException('You do not have permission to reject this document');
        }

        const updated = await this.prisma.document.update({
            where: { id: documentId },
            data: {
                isVerified: false,
                verifiedAt: null,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'REJECT',
                entityType: 'Document',
                entityId: documentId,
                details: { type: document.type },
            },
        });

        // Notify tenant that their document was rejected
        await this.notificationsService.create(
            document.tenant.userId,
            'Document Rejected ❌',
            `Your ${document.type} document has been rejected. Please upload a valid document.`,
            'EMAIL',
            'emailDocumentVerification',
        );

        return updated;
    }

    async delete(documentId: string, userId: string) {
        const document = await this.prisma.document.findFirst({
            where: { id: documentId },
            include: { tenant: true },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // Only tenant can delete their own documents
        if (document.tenant.userId !== userId) {
            throw new ForbiddenException('You can only delete your own documents');
        }

        // Delete file from disk
        if (fs.existsSync(document.path)) {
            fs.unlinkSync(document.path);
        }

        // Delete from database
        await this.prisma.document.delete({
            where: { id: documentId },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'DELETE',
                entityType: 'Document',
                entityId: documentId,
                details: { type: document.type },
            },
        });

        return { message: 'Document deleted successfully' };
    }
}

