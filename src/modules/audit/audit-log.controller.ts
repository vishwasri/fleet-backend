import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Audit Logs (Compliance & History)')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(OrgRole.ADMIN) // Restricted to OWNER and ADMIN (since hierarchy ADMIN >= ADMIN, OWNER >= ADMIN)
  @ApiOperation({ summary: 'View immutable audit log history (restricted to OWNER & ADMIN)' })
  async findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditLogService.findAll(orgId, query);
  }
}
