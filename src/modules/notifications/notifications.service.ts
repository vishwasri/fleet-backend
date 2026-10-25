import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationPriority, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

export interface CreateNotificationParams {
  organizationId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  priority?: NotificationPriority;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async createNotification(params: CreateNotificationParams) {
    return this.prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        entityType: params.entityType,
        entityId: params.entityId,
        priority: params.priority || NotificationPriority.NORMAL,
      },
    });
  }

  async listNotifications(orgId: string, query: NotificationQueryDto, userId?: string) {
    const where: Prisma.NotificationWhereInput = {
      organizationId: orgId,
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
      type: query.type,
      readAt: query.unreadOnly ? null : undefined,
    };

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page: query.page || 1,
        limit: query.take,
        totalPages: Math.ceil(total / query.take),
      },
    };
  }

  async markAsRead(orgId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(orgId: string, userId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        organizationId: orgId,
        userId: userId || undefined,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  async getUnreadCount(orgId: string, userId?: string) {
    return this.prisma.notification.count({
      where: {
        organizationId: orgId,
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
        readAt: null,
      },
    });
  }

  // ----------------------------------------------------
  // AUTOMATED DAILY ALERT SCANNER
  // ----------------------------------------------------

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async scanForDailyAlerts() {
    this.logger.log('Executing daily automated alert scan...');
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      // 1. Scan for pickups due in next 24h
      const upcomingPickups = await this.prisma.booking.findMany({
        where: {
          bookingStatus: 'CONFIRMED',
          pickupDateTime: { gte: now, lte: in24Hours },
        },
      });

      for (const b of upcomingPickups) {
        await this.createNotification({
          organizationId: b.organizationId,
          type: NotificationType.PICKUP_DUE,
          title: `Pickup Due: Booking #${b.bookingNumber}`,
          body: `Vehicle pickup is scheduled for ${b.pickupDateTime.toISOString()}`,
          entityType: 'Booking',
          entityId: b.id,
          priority: NotificationPriority.HIGH,
        });
      }

      // 2. Scan for returns due in next 24h
      const upcomingReturns = await this.prisma.booking.findMany({
        where: {
          bookingStatus: 'PICKED_UP',
          returnDateTime: { gte: now, lte: in24Hours },
        },
      });

      for (const b of upcomingReturns) {
        await this.createNotification({
          organizationId: b.organizationId,
          type: NotificationType.RETURN_DUE,
          title: `Return Due: Booking #${b.bookingNumber}`,
          body: `Vehicle return is scheduled for ${b.returnDateTime.toISOString()}`,
          entityType: 'Booking',
          entityId: b.id,
          priority: NotificationPriority.HIGH,
        });
      }

      this.logger.log(`Daily alert scan completed. Pickups: ${upcomingPickups.length}, Returns: ${upcomingReturns.length}`);
    } catch (err) {
      this.logger.error('Error executing automated alert scan', err);
    }
  }
}
