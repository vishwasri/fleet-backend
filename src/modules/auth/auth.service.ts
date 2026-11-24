import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';
import { SendPhoneOtpDto, VerifyPhoneOtpDto, ResetPasswordPhoneDto } from './dto/phone-auth.dto';
import { SmsService } from './sms.service';
import { AccountType, OrgRole, UserStatus, MarketplaceStatus, Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private smsService: SmsService,
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

  async sendPhoneOtp(dto: SendPhoneOtpDto) {
    const normalized = this.smsService.normalizePhoneNumber(dto.phone);
    if (!normalized || normalized.length < 9) {
      throw new BadRequestException('Invalid phone number provided');
    }

    const purpose = dto.purpose || 'LOGIN';

    if (purpose === 'PASSWORD_RESET') {
      const phoneVariants = [
        normalized,
        '0' + normalized.substring(2),
        '+' + normalized,
        normalized.substring(2),
      ];
      const user = await this.prisma.user.findFirst({
        where: { phone: { in: phoneVariants } },
      });
      if (!user) {
        throw new NotFoundException('No account found registered with this phone number');
      }
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete existing unverified OTPs for this phone & purpose
    await this.prisma.otpVerification.deleteMany({
      where: {
        phone: normalized,
        purpose,
        verified: false,
      },
    });

    // Store new OTP verification
    await this.prisma.otpVerification.create({
      data: {
        phone: normalized,
        otpHash,
        purpose,
        expiresAt,
      },
    });

    // Send SMS via smsapi.lk
    const smsResult = await this.smsService.sendOtp(normalized, otp, purpose);

    if (!smsResult.success) {
      throw new InternalServerErrorException(
        smsResult.error || 'Failed to dispatch SMS verification code via SMSAPI.LK',
      );
    }

    return {
      success: true,
      message: 'Verification code sent successfully via SMS',
      phone: normalized,
      maskedPhone: this.smsService.maskPhoneNumber(normalized),
      expiresInSeconds: 300,
    };
  }

  async verifyPhoneOtp(dto: VerifyPhoneOtpDto) {
    const normalized = this.smsService.normalizePhoneNumber(dto.phone);
    if (!normalized) {
      throw new BadRequestException('Invalid phone number');
    }

    const purpose = dto.purpose || 'LOGIN';

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: normalized,
        purpose,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No active verification request found. Please request a new code.');
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    if (record.attempts >= 5) {
      throw new BadRequestException('Too many invalid attempts. Please request a new verification code.');
    }

    const isMatch = await bcrypt.compare(dto.otp, record.otpHash);
    if (!isMatch) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 4 - record.attempts;
      throw new BadRequestException(
        `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}`,
      );
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    if (purpose === 'REGISTER') {
      return {
        verified: true,
        phone: normalized,
        message: 'Phone number verified successfully.',
      };
    }

    if (purpose === 'PASSWORD_RESET') {
      return {
        verified: true,
        phone: normalized,
        message: 'Phone number verified. You may now reset your password.',
      };
    }

    // LOGIN flow
    const phoneVariants = [
      normalized,
      '0' + normalized.substring(2),
      '+' + normalized,
      normalized.substring(2),
    ];

    const user = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
      },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return {
        verified: true,
        userExists: false,
        phone: normalized,
        message: 'Phone verified, but no account found with this phone number. Please register first.',
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active or suspended.');
    }

    // Update phoneVerifiedAt if not set
    if (!user.phoneVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      });
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
      verified: true,
      userExists: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
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

  async resetPasswordWithPhone(dto: ResetPasswordPhoneDto) {
    const normalized = this.smsService.normalizePhoneNumber(dto.phone);
    if (!normalized) {
      throw new BadRequestException('Invalid phone number');
    }

    // Check if verified record exists or valid OTP code passed
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: normalized,
        purpose: 'PASSWORD_RESET',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No verification request found for this phone number.');
    }

    const isCodeValid =
      record.verified ||
      ((await bcrypt.compare(dto.otp, record.otpHash)) && new Date() <= record.expiresAt);

    if (!isCodeValid) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    const phoneVariants = [
      normalized,
      '0' + normalized.substring(2),
      '+' + normalized,
      normalized.substring(2),
    ];

    const user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants } },
    });

    if (!user) {
      throw new NotFoundException('No account found with this phone number.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        refreshTokenHash: null, // Log out of all sessions
        phoneVerifiedAt: new Date(),
      },
    });

    // Cleanup OTPs for this phone
    await this.prisma.otpVerification.deleteMany({
      where: { phone: normalized, purpose: 'PASSWORD_RESET' },
    });

    return {
      success: true,
      message: 'Password has been successfully updated. You can now log in with your new password.',
    };
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
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '24h',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '30d',
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
