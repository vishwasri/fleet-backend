import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOrgId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-organization-id'] || request.user?.currentOrgId || request.params?.organizationId;
  },
);
