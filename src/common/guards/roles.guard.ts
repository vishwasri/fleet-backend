import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Platform admin bypass
    if (request.user?.accountType === 'PLATFORM_ADMIN') {
      return true;
    }

    const userRole = request.memberRole || request.user?.currentOrgRole;

    if (!userRole) {
      throw new ForbiddenException('No active organization membership or role found');
    }

    // Role hierarchy: OWNER > ADMIN > STAFF > VIEWER
    const roleHierarchy: Record<OrgRole, number> = {
      [OrgRole.OWNER]: 4,
      [OrgRole.ADMIN]: 3,
      [OrgRole.STAFF]: 2,
      [OrgRole.VIEWER]: 1,
    };

    const userLevel = roleHierarchy[userRole as OrgRole] || 0;
    const hasPermission = requiredRoles.some(
      (role) => userLevel >= (roleHierarchy[role] || 0),
    );

    if (!hasPermission) {
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
