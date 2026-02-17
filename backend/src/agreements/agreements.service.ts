import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgreementDto } from './dto';
import { generateAgreementHtml } from './templates';
import { AgreementStatus, TenantStatus } from '@prisma/client';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AgreementsService {
    private uploadDir: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private notificationsService: NotificationsService,
    ) {
        this.uploadDir = this.configService.get('UPLOAD_DIR') || './uploads';
        const agreementsDir = path.join(this.uploadDir, 'agreements');
        if (!fs.existsSync(agreementsDir)) {
            fs.mkdirSync(agreementsDir, { recursive: true });
        }
    }

    async create(ownerId: string, createAgreementDto: CreateAgreementDto) {
        // Verify room ownership
        const room = await this.prisma.room.findFirst({
            where: { id: createAgreementDto.roomId },
            include: {
                property: {
                    include: {
                        owner: true,
                    },
                },
            },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        if (room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission');
        }

        // Verify tenant
        const tenant = await this.prisma.tenant.findFirst({
            where: {
                id: createAgreementDto.tenantId,
                status: { in: [TenantStatus.APPROVED, TenantStatus.ACTIVE] },
            },
            include: {
                user: true,
            },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found or not approved');
        }

        // Check for existing active agreement
        const existingAgreement = await this.prisma.agreement.findFirst({
            where: {
                OR: [
                    { roomId: room.id, status: AgreementStatus.ACTIVE },
                    { tenantId: tenant.id, status: AgreementStatus.ACTIVE },
                ],
            },
        });

        if (existingAgreement) {
            throw new BadRequestException('An active agreement already exists for this room or tenant');
        }

        // Generate agreement number
        const agreementNumber = `AGR-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

        // Create agreement record
        const agreement = await this.prisma.agreement.create({
            data: {
                agreementNumber,
                roomId: room.id,
                tenantId: tenant.id,
                startDate: new Date(createAgreementDto.startDate),
                endDate: new Date(createAgreementDto.endDate),
                monthlyRent: createAgreementDto.monthlyRent,
                securityDeposit: createAgreementDto.securityDeposit,
                maintenanceCharge: createAgreementDto.maintenanceCharge,
                rentDueDay: createAgreementDto.rentDueDay || 1,
                lockInPeriodMonths: createAgreementDto.lockInPeriodMonths || 6,
                noticePeriodDays: createAgreementDto.noticePeriodDays || 30,
                rentEscalation: createAgreementDto.rentEscalation,
                jurisdiction: createAgreementDto.jurisdiction,
                additionalClauses: createAgreementDto.additionalClauses,
                status: AgreementStatus.DRAFT,
            },
            include: {
                room: {
                    include: {
                        property: {
                            include: { owner: true },
                        },
                    },
                },
                tenant: {
                    include: { user: true },
                },
            },
        });

        // Generate PDF
        const pdfPath = await this.generatePdf(agreement);

        // Update agreement with PDF path
        const updated = await this.prisma.agreement.update({
            where: { id: agreement.id },
            data: { pdfPath },
            include: {
                room: {
                    include: { property: true },
                },
                tenant: {
                    include: { user: true },
                },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'CREATE',
                entityType: 'Agreement',
                entityId: agreement.id,
                details: { agreementNumber },
            },
        });

        // Notify tenant about new agreement (respects emailAgreementUpdates setting)
        await this.notificationsService.create(
            tenant.userId,
            'New Rent Agreement Created',
            `A rent agreement has been generated for Room ${room.roomNumber} at ${room.property.name}. Please review and sign.`,
            'EMAIL',
            'emailAgreementUpdates',
        );

        return updated;
    }

    private async generatePdf(agreement: any): Promise<string> {
        const owner = agreement.room.property.owner;
        const tenant = agreement.tenant;
        const room = agreement.room;
        const property = room.property;

        const formatDate = (date: Date) => {
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
        };

        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-IN').format(amount);
        };

        const additionalClauses: string[] = [];
        if (agreement.additionalClauses) {
            Object.values(agreement.additionalClauses).forEach((clause: any) => {
                if (typeof clause === 'string') {
                    additionalClauses.push(clause);
                }
            });
        }

        const html = generateAgreementHtml({
            agreementNumber: agreement.agreementNumber,
            signedDate: formatDate(new Date()),
            ownerName: `${owner.firstName} ${owner.lastName}`,
            ownerAddress: property.address,
            ownerPhone: owner.phone || 'N/A',
            ownerEmail: owner.email,
            tenantName: `${tenant.user.firstName} ${tenant.user.lastName}`,
            tenantFatherName: tenant.fatherName || 'N/A',
            tenantAddress: tenant.permanentAddress || 'N/A',
            tenantPhone: tenant.user.phone || 'N/A',
            tenantEmail: tenant.user.email,
            propertyName: property.name,
            propertyAddress: `${property.address}, ${property.city}, ${property.state} - ${property.pincode}`,
            roomNumber: room.roomNumber,
            furnishing: room.furnishing.replace('_', ' '),
            startDate: formatDate(agreement.startDate),
            endDate: formatDate(agreement.endDate),
            monthlyRent: formatCurrency(Number(agreement.monthlyRent)),
            securityDeposit: formatCurrency(Number(agreement.securityDeposit)),
            maintenanceCharge: formatCurrency(Number(agreement.maintenanceCharge) || 0),
            rentDueDay: agreement.rentDueDay,
            lockInPeriodMonths: agreement.lockInPeriodMonths,
            noticePeriodDays: agreement.noticePeriodDays,
            rentEscalation: (Number(agreement.rentEscalation) || 0).toString(),
            jurisdiction: agreement.jurisdiction,
            additionalClauses,
        });

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const fileName = `${agreement.agreementNumber}.pdf`;
        const filePath = path.join(this.uploadDir, 'agreements', fileName);

        await page.pdf({
            path: filePath,
            format: 'A4',
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
            printBackground: true,
        });

        await browser.close();

        return filePath;
    }

    async findAll(userId: string, userRole: string) {
        // For OWNER: return agreements for all their properties
        // For TENANT: return only their own agreements
        if (userRole === 'OWNER') {
            const properties = await this.prisma.property.findMany({
                where: { ownerId: userId, isActive: true },
                select: { id: true },
            });

            const propertyIds = properties.map((p) => p.id);

            return this.prisma.agreement.findMany({
                where: {
                    room: {
                        propertyId: { in: propertyIds },
                    },
                },
                include: {
                    room: {
                        include: {
                            property: {
                                select: { name: true, address: true },
                            },
                        },
                    },
                    tenant: {
                        include: {
                            user: {
                                select: { firstName: true, lastName: true, email: true },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        } else {
            // TENANT: find their tenant record and get their agreements
            const tenant = await this.prisma.tenant.findFirst({
                where: { userId },
            });

            if (!tenant) {
                return [];
            }

            return this.prisma.agreement.findMany({
                where: {
                    tenantId: tenant.id,
                },
                include: {
                    room: {
                        include: {
                            property: {
                                select: { name: true, address: true },
                            },
                        },
                    },
                    tenant: {
                        include: {
                            user: {
                                select: { firstName: true, lastName: true, email: true },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
    }

    async findOne(id: string, userId: string, userRole?: string) {
        const agreement = await this.prisma.agreement.findFirst({
            where: { id },
            include: {
                room: {
                    include: {
                        property: {
                            include: { owner: true },
                        },
                    },
                },
                tenant: {
                    include: { user: true },
                },
            },
        });

        if (!agreement) {
            throw new NotFoundException('Agreement not found');
        }

        // Check access
        const isOwner = agreement.room.property.ownerId === userId;
        const isTenant = agreement.tenant.userId === userId;

        if (!isOwner && !isTenant) {
            throw new ForbiddenException('You do not have access to this agreement');
        }

        return agreement;
    }

    async downloadPdf(id: string, userId: string) {
        const agreement = await this.findOne(id, userId);

        if (!agreement.pdfPath || !fs.existsSync(agreement.pdfPath)) {
            throw new NotFoundException('PDF file not found');
        }

        return {
            buffer: fs.readFileSync(agreement.pdfPath),
            fileName: `${agreement.agreementNumber}.pdf`,
        };
    }

    async updateStatus(id: string, ownerId: string, status: AgreementStatus) {
        const agreement = await this.prisma.agreement.findFirst({
            where: { id },
            include: {
                room: {
                    include: { property: true },
                },
            },
        });

        if (!agreement) {
            throw new NotFoundException('Agreement not found');
        }

        if (agreement.room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission');
        }

        const updated = await this.prisma.agreement.update({
            where: { id },
            data: {
                status,
                signedDate: status === AgreementStatus.ACTIVE ? new Date() : undefined,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'UPDATE_STATUS',
                entityType: 'Agreement',
                entityId: id,
                details: { status },
            },
        });

        return updated;
    }

    async update(id: string, ownerId: string, updateData: Partial<CreateAgreementDto>) {
        const agreement = await this.prisma.agreement.findFirst({
            where: { id },
            include: {
                room: {
                    include: { property: true },
                },
            },
        });

        if (!agreement) {
            throw new NotFoundException('Agreement not found');
        }

        if (agreement.room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission');
        }

        // Only allow updates for DRAFT or PENDING_SIGNATURE status
        if (agreement.status !== AgreementStatus.DRAFT && agreement.status !== AgreementStatus.PENDING_SIGNATURE) {
            throw new BadRequestException('Agreement cannot be modified after both parties have signed');
        }

        const updated = await this.prisma.agreement.update({
            where: { id },
            data: {
                ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
                ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
                ...(updateData.monthlyRent !== undefined && { monthlyRent: updateData.monthlyRent }),
                ...(updateData.securityDeposit !== undefined && { securityDeposit: updateData.securityDeposit }),
                ...(updateData.maintenanceCharge !== undefined && { maintenanceCharge: updateData.maintenanceCharge }),
                ...(updateData.rentDueDay !== undefined && { rentDueDay: updateData.rentDueDay }),
                ...(updateData.lockInPeriodMonths !== undefined && { lockInPeriodMonths: updateData.lockInPeriodMonths }),
                ...(updateData.noticePeriodDays !== undefined && { noticePeriodDays: updateData.noticePeriodDays }),
                ...(updateData.rentEscalation !== undefined && { rentEscalation: updateData.rentEscalation }),
                ...(updateData.jurisdiction && { jurisdiction: updateData.jurisdiction }),
                ...(updateData.additionalClauses && { additionalClauses: updateData.additionalClauses }),
            },
            include: {
                room: {
                    include: {
                        property: true,
                    },
                },
                tenant: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'UPDATE',
                entityType: 'Agreement',
                entityId: id,
                details: { ...updateData },
            },
        });

        return updated;
    }

    async delete(id: string, ownerId: string) {
        const agreement = await this.prisma.agreement.findFirst({
            where: { id },
            include: {
                room: {
                    include: { property: true },
                },
            },
        });

        if (!agreement) {
            throw new NotFoundException('Agreement not found');
        }

        if (agreement.room.property.ownerId !== ownerId) {
            throw new ForbiddenException('You do not have permission');
        }

        // Only allow deletion for DRAFT or PENDING_SIGNATURE status
        if (agreement.status !== AgreementStatus.DRAFT && agreement.status !== AgreementStatus.PENDING_SIGNATURE) {
            throw new BadRequestException('Agreement cannot be deleted after both parties have signed. You can only terminate it.');
        }

        // Delete the PDF file if it exists
        if (agreement.pdfPath && fs.existsSync(agreement.pdfPath)) {
            fs.unlinkSync(agreement.pdfPath);
        }

        await this.prisma.agreement.delete({
            where: { id },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: ownerId,
                action: 'DELETE',
                entityType: 'Agreement',
                entityId: id,
                details: { agreementNumber: agreement.agreementNumber },
            },
        });

        return { message: 'Agreement deleted successfully' };
    }
}
