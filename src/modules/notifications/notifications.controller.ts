import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('In-App Notifications & Alerts')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List in-app notifications (pickups, returns, overdue, documents, partner alerts)' })
  async list(
    @CurrentOrgId() orgId: string,
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.listNotifications(orgId, query, user.userId);
  }

  @Patch(':id/read')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Mark an individual notification as read' })
  async markRead(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(orgId, id);
  }

  @Post('read-all')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllRead(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.markAllAsRead(orgId, user.userId);
  }
}
