import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageTemplateDto, SendMessageDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Internal Messages & Notifications')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('templates')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Create message template (Email, SMS, WhatsApp)' })
  async createTemplate(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateMessageTemplateDto,
  ) {
    return this.messagesService.createTemplate(orgId, dto);
  }

  @Get('templates')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List message templates' })
  async listTemplates(@CurrentOrgId() orgId: string) {
    return this.messagesService.listTemplates(orgId);
  }

  @Delete('templates/:id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Delete message template' })
  async deleteTemplate(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.messagesService.deleteTemplate(orgId, id);
  }

  @Post('send')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Send email/SMS/WhatsApp message to customer or partner' })
  async sendMessage(
    @CurrentOrgId() orgId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(orgId, dto);
  }

  @Get('logs')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get message dispatch logs' })
  async listLogs(
    @CurrentOrgId() orgId: string,
    @Query('bookingId') bookingId?: string,
    @Query('customerProfileId') customerProfileId?: string,
    @Query('partnerRentalId') partnerRentalId?: string,
  ) {
    return this.messagesService.listMessageLogs(orgId, {
      bookingId,
      customerProfileId,
      partnerRentalId,
    });
  }
}
