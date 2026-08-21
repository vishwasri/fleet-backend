import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ExtraChargeStatus,
  Prisma,
  TransactionCategory,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateExtraChargeDto } from './dto/create-extra-charge.dto';
import Decimal from 'decimal.js';

@Injectable()
export class ExtraChargesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async createExtraCharge(orgId: string, dto: CreateExtraChargeDto, actorUserId: string) {
    if (!dto.bookingId && !dto.partnerRentalId) {
      throw new BadRequestException('Extra charge must be linked to a booking or partner rental');
    }

    const totalAmt = new Decimal(dto.amount).plus(new Decimal(dto.taxAmount || 0));

    const charge = await this.prisma.extraCharge.create({
      data: {
        organizationId: orgId,
        bookingId: dto.bookingId,
        partnerRentalId: dto.partnerRentalId,
        type: dto.type,
        description: dto.description,
        quantity: dto.quantity ? new Prisma.Decimal(dto.quantity) : new Prisma.Decimal(1),
        unitAmount: dto.unitAmount ? new Prisma.Decimal(dto.unitAmount) : new Prisma.Decimal(dto.amount),
        amount: new Prisma.Decimal(totalAmt.toFixed(2)),
        taxAmount: new Prisma.Decimal(dto.taxAmount || 0),
        status: ExtraChargeStatus.PENDING,
        createdByUserId: actorUserId,
        notes: dto.notes,
        attachmentUrls: dto.attachmentUrls ? JSON.stringify(dto.attachmentUrls) : Prisma.JsonNull,
      },
    });

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'CREATE_EXTRA_CHARGE',
      entityType: 'ExtraCharge',
      entityId: charge.id,
      newValue: charge,
    });

    return charge;
  }

  async approveExtraCharge(orgId: string, id: string, actorUserId: string) {
    const charge = await this.prisma.extraCharge.findFirst({
      where: { id, organizationId: orgId },
      include: {
        booking: true,
        partnerRental: true,
      },
    });

    if (!charge) {
      throw new NotFoundException('Extra charge record not found');
    }

    if (charge.status !== ExtraChargeStatus.PENDING) {
      throw new BadRequestException(`Extra charge is already ${charge.status}`);
    }

    const chargeAmt = new Decimal(charge.amount.toString());

    return this.prisma.$transaction(async (tx) => {
      // 1. Post to Financial Ledger (Income)
      await tx.financialTransaction.create({
        data: {
          organizationId: orgId,
          vehicleId: charge.booking?.vehicleId || charge.partnerRental?.vehicleId,
          bookingId: charge.bookingId,
          partnerRentalId: charge.partnerRentalId,
          type: TransactionType.INCOME,
          category: TransactionCategory.EXTRA_CHARGE,
          amount: new Prisma.Decimal(chargeAmt.toFixed(2)),
          currency: 'USD',
          paymentMethod: 'INVOICE_RECEIVABLE',
          notes: `Extra Charge Approved: ${charge.description} (${charge.type})`,
        },
      });

      // 2. Increase balance on booking/partner rental
      if (charge.booking) {
        const newTotal = new Decimal(charge.booking.totalAmount.toString()).plus(chargeAmt);
        const newBalance = new Decimal(charge.booking.balanceAmount.toString()).plus(chargeAmt);
        await tx.booking.update({
          where: { id: charge.booking.id },
          data: {
            totalAmount: new Prisma.Decimal(newTotal.toFixed(2)),
            balanceAmount: new Prisma.Decimal(newBalance.toFixed(2)),
            paymentStatus: newBalance.greaterThan(0) ? 'PARTIALLY_PAID' : charge.booking.paymentStatus,
          },
        });
      } else if (charge.partnerRental) {
        const newTotal = new Decimal(charge.partnerRental.totalAmount.toString()).plus(chargeAmt);
        const newBalance = new Decimal(charge.partnerRental.balanceAmount.toString()).plus(chargeAmt);
        await tx.partnerRental.update({
          where: { id: charge.partnerRental.id },
          data: {
            totalAmount: new Prisma.Decimal(newTotal.toFixed(2)),
            balanceAmount: new Prisma.Decimal(newBalance.toFixed(2)),
            paymentStatus: newBalance.greaterThan(0) ? 'PARTIALLY_PAID' : charge.partnerRental.paymentStatus,
          },
        });
      }

      // 3. Mark charge approved
      const updated = await tx.extraCharge.update({
        where: { id },
        data: { status: ExtraChargeStatus.APPROVED },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'APPROVE_EXTRA_CHARGE',
          entityType: 'ExtraCharge',
          entityId: charge.id,
          previousValue: charge,
          newValue: updated,
        },
        tx,
      );

      return updated;
    });
  }

  async waiveExtraCharge(orgId: string, id: string, actorUserId: string) {
    const charge = await this.prisma.extraCharge.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!charge) {
      throw new NotFoundException('Extra charge record not found');
    }

    const updated = await this.prisma.extraCharge.update({
      where: { id },
      data: { status: ExtraChargeStatus.WAIVED },
    });

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'WAIVE_EXTRA_CHARGE',
      entityType: 'ExtraCharge',
      entityId: charge.id,
      previousValue: charge,
      newValue: updated,
    });

    return updated;
  }

  async listExtraCharges(orgId: string, bookingId?: string, partnerRentalId?: string) {
    return this.prisma.extraCharge.findMany({
      where: {
        organizationId: orgId,
        bookingId: bookingId || undefined,
        partnerRentalId: partnerRentalId || undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
