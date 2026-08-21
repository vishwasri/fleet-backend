import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  accountType: string;
  orgId?: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'default-access-secret-key-32-chars-long',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    return {
      userId: user.id,
      email: user.email,
      accountType: user.accountType,
      firstName: user.firstName,
      lastName: user.lastName,
      currentOrgId: payload.orgId || user.memberships[0]?.organizationId,
      currentOrgRole: payload.role || user.memberships[0]?.role,
      memberships: user.memberships,
    };
  }
}
