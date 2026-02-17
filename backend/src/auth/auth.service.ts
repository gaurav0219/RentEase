import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { email, phone, password, firstName, lastName, role } = registerDto;

        // Check if an active user already exists with this email/phone
        const existingActive = await this.prisma.user.findFirst({
            where: {
                isActive: true,
                OR: [
                    { email },
                    ...(phone ? [{ phone }] : []),
                ],
            },
        });

        if (existingActive) {
            throw new ConflictException('User with this email or phone already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check for a soft-deleted user with the same email — reactivate instead of creating duplicate
        const deletedUser = await this.prisma.user.findFirst({
            where: { email, isActive: false },
            include: { tenant: true },
        });

        let user;
        if (deletedUser) {
            // Reactivate the soft-deleted account with fresh data
            user = await this.prisma.user.update({
                where: { id: deletedUser.id },
                data: {
                    password: hashedPassword,
                    firstName,
                    lastName,
                    phone: phone || null,
                    role,
                    isActive: true,
                },
            });

            // Handle tenant profile for reactivated user
            if (role === UserRole.TENANT && deletedUser.tenant) {
                await this.prisma.tenant.update({
                    where: { id: deletedUser.tenant.id },
                    data: { status: 'APPROVED' },
                });
            } else if (role === UserRole.TENANT && !deletedUser.tenant) {
                await this.prisma.tenant.create({
                    data: { userId: user.id },
                });
            }
        } else {
            // Brand new user
            user = await this.prisma.user.create({
                data: {
                    email,
                    phone,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    role,
                },
            });

            if (role === UserRole.TENANT) {
                await this.prisma.tenant.create({
                    data: { userId: user.id },
                });
            }
        }

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);

        // Log the registration
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'REGISTER',
                entityType: 'User',
                entityId: user.id,
                details: { role: user.role, reactivated: !!deletedUser },
            },
        });

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        };
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { email, password } = loginDto;

        // Find user
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);

        // Log the login
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN',
                entityType: 'User',
                entityId: user.id,
            },
        });

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        };
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            const accessToken = this.jwtService.sign(
                { sub: user.id, email: user.email, role: user.role },
                {
                    secret: this.configService.get('JWT_SECRET'),
                    expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
                },
            );

            return { accessToken };
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenant: true,
            },
        });

        if (!user || !user.isActive) {
            return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return result;
    }

    private async generateTokens(userId: string, email: string, role: UserRole) {
        const payload = { sub: userId, email, role };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '30d',
            }),
        ]);

        return { accessToken, refreshToken };
    }
}
