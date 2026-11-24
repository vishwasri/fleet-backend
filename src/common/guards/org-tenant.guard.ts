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

    let membership = targetOrgId
      ? await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: targetOrgId,
              userId: user.userId,
            },
          },
          include: {
            organization: true,
          },
        })
      : null;

    // If targetOrgId was invalid, stale, or user is not a member of it, check user's active memberships
    if (!membership || membership.status !== 'ACTIVE') {
      const userMemberships = await this.prisma.organizationMember.findMany({
        where: { userId: user.userId, status: 'ACTIVE' },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      });

      if (userMemberships.length > 0) {
        // Fall back to user's primary or first active organization
        membership = userMemberships[0];
      } else {
        throw new ForbiddenException('User is not associated with any active organization');
      }
    }

    request.organizationId = membership.organizationId;
    request.memberRole = membership.role;
    request.organization = membership.organization;

    return true;
  }
}
