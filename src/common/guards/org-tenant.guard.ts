import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrgTenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle unauthenticated
    }

    // Platform admin bypass
    if (user.accountType === 'PLATFORM_ADMIN') {
      return true;
    }

    const orgIdFromHeader = request.headers['x-organization-id'] as string;
    const orgIdFromParam = request.params?.organizationId as string;
    const targetOrgId = orgIdFromHeader || orgIdFromParam || user.currentOrgId;

    if (!targetOrgId) {
      // If user only belongs to 1 organization, default to it
      const memberships = await this.prisma.organizationMember.findMany({
        where: { userId: user.userId, status: 'ACTIVE' },
        include: { organization: true },
      });

      if (memberships.length === 1) {
        request.organizationId = memberships[0].organizationId;
        request.memberRole = memberships[0].role;
        request.organization = memberships[0].organization;
        return true;
      }

      if (memberships.length === 0) {
        throw new ForbiddenException('User is not associated with any active organization');
      }

      throw new BadRequestException('Organization context required. Please pass x-organization-id header');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: user.userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You do not have active access to this organization');
    }

    request.organizationId = membership.organizationId;
    request.memberRole = membership.role;
    request.organization = membership.organization;

    return true;
  }
}
