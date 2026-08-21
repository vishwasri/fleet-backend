import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageTemplateDto, SendMessageDto } from './dto/create-template.dto';
import { IMessageProvider, MESSAGE_PROVIDER } from './providers/message-provider.interface';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    @Inject(MESSAGE_PROVIDER) private messageProvider: IMessageProvider,
  ) {}

  // ==========================================
  // TEMPLATES
  // ==========================================

  async createTemplate(orgId: string, dto: CreateMessageTemplateDto) {
    return this.prisma.messageTemplate.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
        variables: dto.variables ? JSON.stringify(dto.variables) : Prisma.JsonNull,
      },
    });
  }

  async listTemplates(orgId: string) {
    return this.prisma.messageTemplate.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async deleteTemplate(orgId: string, id: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!template) {
      throw new NotFoundException('Message template not found');
    }

    return this.prisma.messageTemplate.delete({
      where: { id },
    });
  }

  // ==========================================
  // MESSAGE SENDING & LOGS
  // ==========================================

  async sendMessage(orgId: string, dto: SendMessageDto) {
    let subject = dto.subject;
    let body = dto.body;

    // If templateId provided, interpolate
    if (dto.templateId) {
      const template = await this.prisma.messageTemplate.findFirst({
        where: { id: dto.templateId, organizationId: orgId },
      });

      if (template) {
        subject = template.subject;
        body = template.body;

        if (dto.templateVariables) {
          for (const [key, value] of Object.entries(dto.templateVariables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            if (subject) subject = subject.replace(regex, value);
            body = body.replace(regex, value);
          }
        }
      }
    }

    // Call provider
    const sendResult = await this.messageProvider.send({
      channel: dto.channel,
      recipient: dto.recipient,
      subject,
      body,
    });

    // Record message log
    return this.prisma.messageLog.create({
      data: {
        organizationId: orgId,
        bookingId: dto.bookingId,
        customerProfileId: dto.customerProfileId,
        partnerRentalId: dto.partnerRentalId,
        channel: dto.channel,
        recipient: dto.recipient,
        subject,
        body,
        status: sendResult.success ? MessageStatus.SENT : MessageStatus.FAILED,
        providerMessageId: sendResult.providerMessageId,
        errorMessage: sendResult.error,
        sentAt: sendResult.success ? new Date() : null,
      },
    });
  }

  async listMessageLogs(
    orgId: string,
    filters?: { bookingId?: string; customerProfileId?: string; partnerRentalId?: string },
  ) {
    return this.prisma.messageLog.findMany({
      where: {
        organizationId: orgId,
        bookingId: filters?.bookingId || undefined,
        customerProfileId: filters?.customerProfileId || undefined,
        partnerRentalId: filters?.partnerRentalId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
