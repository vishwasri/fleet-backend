import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AccountType } from '@prisma/client';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.accountType !== AccountType.PLATFORM_ADMIN) {
      throw new ForbiddenException('Super Admin platform privileges required for this action');
    }

    return true;
  }
}
