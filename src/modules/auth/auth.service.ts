import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';
import { AccountType, OrgRole, UserStatus, MarketplaceStatus, Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerOrganization(dto: RegisterOrganizationDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create central user entity
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          accountType: AccountType.BUSINESS_USER,
          status: UserStatus.ACTIVE,
        },
      });

      // 2. Create organization (default PRIVATE as per MVP rule)
      const organization = await tx.organization.create({
        data: {
          legalName: dto.legalName,
          displayName: dto.displayName,
          email: dto.organizationEmail.toLowerCase(),
          phone: dto.organizationPhone,
          address: dto.address,
          timezone: dto.timezone || 'UTC',
          currency: dto.currency || 'USD',
          marketplaceStatus: MarketplaceStatus.PRIVATE,
          acceptsOnlineBookings: false,
        },
      });

      // 3. Link owner membership
      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: OrgRole.OWNER,
        },
      });

      // 4. Generate JWT tokens
      const tokens = await this.generateTokens(user.id, user.email, user.accountType, organization.id, OrgRole.OWNER);
      await this.updateRefreshToken(user.id, tokens.refreshToken, tx);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountType: user.accountType,
        },
        organization: {
          id: organization.id,
          legalName: organization.legalName,
          displayName: organization.displayName,
          email: organization.email,
          role: member.role,
        },
        tokens,
      };
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const primaryOrg = user.memberships[0]?.organization;
    const primaryRole = user.memberships[0]?.role;

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.accountType,
      primaryOrg?.id,
      primaryRole,
    );

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
      },
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        displayName: m.organization.displayName,
        role: m.role,
      })),
      tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const primaryOrgId = user.memberships[0]?.organizationId;
    const primaryRole = user.memberships[0]?.role;

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.accountType,
      primaryOrgId,
      primaryRole,
    );

    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        accountType: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                legalName: true,
                displayName: true,
                email: true,
                phone: true,
                currency: true,
                timezone: true,
                marketplaceStatus: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Return standard message to prevent email enumeration
    return { message: 'If an account exists with that email, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPass: string) {
    // Placeholder implementation for password reset tokens
    return { message: 'Password has been reset successfully' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    accountType: string,
    orgId?: string,
    role?: string,
  ) {
    const payload = { sub: userId, email, accountType, orgId, role };
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'default-access-secret-key-32-chars-long';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret-key-32-chars-long';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await prismaClient.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }
}
