import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DepositStatus, Prisma, TransactionCategory, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import {
  CreateDepositDto,
  DeductDepositDto,
  ForfeitDepositDto,
  MarkDepositReceivedDto,
  RefundDepositDto,
} from './dto/deposit-ops.dto';
import Decimal from 'decimal.js';

@Injectable()
export class DepositsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async createDeposit(
    orgId: string,
    dto: CreateDepositDto,
    actorUserId?: string,
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    if (!dto.bookingId && !dto.partnerRentalId) {
      throw new BadRequestException('Deposit must be linked to a direct booking or partner rental');
    }

    // Ensure only one active deposit
    const existing = await prismaClient.deposit.findFirst({
      where: {
        organizationId: orgId,
        bookingId: dto.bookingId || undefined,
        partnerRentalId: dto.partnerRentalId || undefined,
        status: { in: [DepositStatus.PENDING, DepositStatus.RECEIVED, DepositStatus.HELD, DepositStatus.PARTIALLY_DEDUCTED] },
      },
    });

    if (existing) {
      throw new ConflictException('An active deposit already exists for this rental record');
    }

    const deposit = await prismaClient.deposit.create({
      data: {
        organizationId: orgId,
        bookingId: dto.bookingId,
        partnerRentalId: dto.partnerRentalId,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency || 'USD',
        status: DepositStatus.PENDING,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
      },
    });

    await this.auditLogService.logEvent(
      {
        orgId,
        actorUserId,
        action: 'CREATE_DEPOSIT',
        entityType: 'Deposit',
        entityId: deposit.id,
        newValue: deposit,
      },
      prismaClient,
    );

    return deposit;
  }

  async markReceived(orgId: string, id: string, dto: MarkDepositReceivedDto, actorUserId?: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit record not found');
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException(`Deposit is already in status: ${deposit.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.deposit.update({
        where: { id },
        data: {
          status: DepositStatus.RECEIVED,
          receivedAt: new Date(),
          paymentMethod: dto.paymentMethod,
          reference: dto.reference || deposit.reference,
          notes: dto.notes ? `${deposit.notes || ''}\n[Received]: ${dto.notes}`.trim() : deposit.notes,
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'DEPOSIT_RECEIVED',
          entityType: 'Deposit',
          entityId: deposit.id,
          previousValue: deposit,
          newValue: updated,
        },
        tx,
      );

      return updated;
    });
  }

  async holdDeposit(orgId: string, id: string, notes?: string, actorUserId?: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit record not found');
    }

    const updated = await this.prisma.deposit.update({
      where: { id },
      data: {
        status: DepositStatus.HELD,
        notes: notes ? `${deposit.notes || ''}\n[Held]: ${notes}`.trim() : deposit.notes,
      },
    });

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'DEPOSIT_HELD',
      entityType: 'Deposit',
      entityId: deposit.id,
      previousValue: deposit,
      newValue: updated,
    });

    return updated;
  }

  async deductDeposit(orgId: string, id: string, dto: DeductDepositDto, actorUserId?: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit record not found');
    }

    const totalDeposit = new Decimal(deposit.amount.toString());
    const prevDeducted = new Decimal(deposit.deductedAmount.toString());
    const prevRefunded = new Decimal(deposit.refundAmount.toString());
    const deductAmt = new Decimal(dto.amount);

    const remaining = totalDeposit.minus(prevDeducted).minus(prevRefunded);

    if (deductAmt.greaterThan(remaining)) {
      throw new BadRequestException(
        `Deduction amount (${deductAmt.toFixed(2)}) exceeds remaining available deposit (${remaining.toFixed(2)})`,
      );
    }

    const newDeducted = prevDeducted.plus(deductAmt);
    const isFullyDeducted = newDeducted.plus(prevRefunded).gte(totalDeposit);

    return this.prisma.$transaction(async (tx) => {
      // 1. Post financial ledger entry (Income - Deposit Deduction)
      await tx.financialTransaction.create({
        data: {
          organizationId: orgId,
          bookingId: deposit.bookingId,
          partnerRentalId: deposit.partnerRentalId,
          type: TransactionType.INCOME,
          category: TransactionCategory.DEPOSIT_DEDUCTION,
          amount: new Prisma.Decimal(deductAmt.toFixed(2)),
          currency: deposit.currency,
          paymentMethod: deposit.paymentMethod || 'DEPOSIT_DEDUCTION',
          reference: dto.reference,
          notes: `Deposit Deduction: ${dto.reason}`,
        },
      });

      // 2. Update Deposit record
      const updated = await tx.deposit.update({
        where: { id },
        data: {
          deductedAmount: new Prisma.Decimal(newDeducted.toFixed(2)),
          status: isFullyDeducted ? DepositStatus.FULLY_DEDUCTED : DepositStatus.PARTIALLY_DEDUCTED,
          notes: `${deposit.notes || ''}\n[Deduction ${deductAmt.toFixed(2)}]: ${dto.reason}`.trim(),
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'DEPOSIT_DEDUCTED',
          entityType: 'Deposit',
          entityId: deposit.id,
          previousValue: deposit,
          newValue: updated,
          metadata: { amount: deductAmt.toFixed(2), reason: dto.reason },
        },
        tx,
      );

      return updated;
    });
  }

  async refundDeposit(orgId: string, id: string, dto: RefundDepositDto, actorUserId?: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit record not found');
    }

    const totalDeposit = new Decimal(deposit.amount.toString());
    const prevDeducted = new Decimal(deposit.deductedAmount.toString());
    const prevRefunded = new Decimal(deposit.refundAmount.toString());
    const remaining = totalDeposit.minus(prevDeducted).minus(prevRefunded);

    const refundAmt = dto.amount !== undefined ? new Decimal(dto.amount) : remaining;

    if (refundAmt.greaterThan(remaining)) {
      throw new BadRequestException(
        `Refund amount (${refundAmt.toFixed(2)}) exceeds remaining available deposit (${remaining.toFixed(2)})`,
      );
    }

    if (refundAmt.lte(0)) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    const newRefunded = prevRefunded.plus(refundAmt);

    return this.prisma.$transaction(async (tx) => {
      // 1. Post financial ledger entry (Expense - Deposit Refund)
      await tx.financialTransaction.create({
        data: {
          organizationId: orgId,
          bookingId: deposit.bookingId,
          partnerRentalId: deposit.partnerRentalId,
          type: TransactionType.EXPENSE,
          category: TransactionCategory.DEPOSIT_REFUND,
          amount: new Prisma.Decimal(refundAmt.toFixed(2)),
          currency: deposit.currency,
          paymentMethod: dto.paymentMethod || deposit.paymentMethod || 'ORIGINAL_PAYMENT_METHOD',
          reference: dto.reference,
          notes: dto.notes || 'Security deposit refund',
        },
      });

      // 2. Update Deposit record
      const updated = await tx.deposit.update({
        where: { id },
        data: {
          refundAmount: new Prisma.Decimal(newRefunded.toFixed(2)),
          refundedAt: new Date(),
          status: DepositStatus.REFUNDED,
          notes: dto.notes ? `${deposit.notes || ''}\n[Refund ${refundAmt.toFixed(2)}]: ${dto.notes}`.trim() : deposit.notes,
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'DEPOSIT_REFUNDED',
          entityType: 'Deposit',
          entityId: deposit.id,
          previousValue: deposit,
          newValue: updated,
          metadata: { amount: refundAmt.toFixed(2) },
        },
        tx,
      );

      return updated;
    });
  }

  async forfeitDeposit(orgId: string, id: string, dto: ForfeitDepositDto, actorUserId?: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit record not found');
    }

    const totalDeposit = new Decimal(deposit.amount.toString());
    const prevDeducted = new Decimal(deposit.deductedAmount.toString());
    const prevRefunded = new Decimal(deposit.refundAmount.toString());
    const remaining = totalDeposit.minus(prevDeducted).minus(prevRefunded);

    if (remaining.lte(0)) {
      throw new BadRequestException('No remaining deposit balance available to forfeit');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Post financial ledger entry (Income - Deposit Forfeiture)
      await tx.financialTransaction.create({
        data: {
          organizationId: orgId,
          bookingId: deposit.bookingId,
          partnerRentalId: deposit.partnerRentalId,
          type: TransactionType.INCOME,
          category: TransactionCategory.DEPOSIT_FORFEIT,
          amount: new Prisma.Decimal(remaining.toFixed(2)),
          currency: deposit.currency,
          paymentMethod: deposit.paymentMethod || 'DEPOSIT_FORFEIT',
          notes: `Deposit Forfeited: ${dto.reason}`,
        },
      });

      const updated = await tx.deposit.update({
        where: { id },
        data: {
          status: DepositStatus.FORFEITED,
          notes: `${deposit.notes || ''}\n[Forfeited ${remaining.toFixed(2)}]: ${dto.reason}`.trim(),
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'DEPOSIT_FORFEITED',
          entityType: 'Deposit',
          entityId: deposit.id,
          previousValue: deposit,
          newValue: updated,
          metadata: { forfeitedAmount: remaining.toFixed(2), reason: dto.reason },
        },
        tx,
      );

      return updated;
    });
  }

  async listDeposits(orgId: string, bookingId?: string, partnerRentalId?: string) {
    return this.prisma.deposit.findMany({
      where: {
        organizationId: orgId,
        bookingId: bookingId || undefined,
        partnerRentalId: partnerRentalId || undefined,
      },
      include: {
        booking: { select: { id: true, bookingNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDepositDetails(orgId: string, id: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id, organizationId: orgId },
      include: {
        booking: true,
        partnerRental: true,
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit record not found');
    }

    return deposit;
  }
}
