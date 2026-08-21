import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface CreateAuditLogParams {
  orgId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  metadata?: any;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const sensitiveKeys = ['password', 'passwordHash', 'refreshToken', 'refreshTokenHash', 'token', 'secret'];
    const cleaned = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(cleaned)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof cleaned[key] === 'object') {
        cleaned[key] = this.sanitize(cleaned[key]);
      }
    }
    return cleaned;
  }

  async logEvent(
    params: CreateAuditLogParams,
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const prev = params.previousValue ? this.sanitize(params.previousValue) : undefined;
    const next = params.newValue ? this.sanitize(params.newValue) : undefined;
    const meta = params.metadata ? this.sanitize(params.metadata) : undefined;

    return prismaClient.auditLog.create({
      data: {
        organizationId: params.orgId,
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousValue: prev !== undefined ? JSON.stringify(prev) : Prisma.JsonNull,
        newValue: next !== undefined ? JSON.stringify(next) : Prisma.JsonNull,
        metadata: meta !== undefined ? JSON.stringify(meta) : Prisma.JsonNull,
      },
    });
  }

  async findAll(orgId: string, query: AuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      organizationId: orgId,
      entityType: query.entityType,
      entityId: query.entityId,
      actorUserId: query.actorUserId,
      action: query.action ? { contains: query.action } : undefined,
    };

    if (query.startDate || query.endDate) {
      where.createdAt = {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: query.endDate ? new Date(query.endDate) : undefined,
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
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
}
