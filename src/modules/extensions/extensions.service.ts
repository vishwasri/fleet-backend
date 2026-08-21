import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ExtensionStatus,
  Prisma,
  TransactionCategory,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AuditLogService } from '../audit/audit-log.service';
import { RequestExtensionDto, RejectExtensionDto } from './dto/extension-ops.dto';
import Decimal from 'decimal.js';

@Injectable()
export class ExtensionsService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private auditLogService: AuditLogService,
  ) {}

  private calculateDays(start: Date, end: Date): number {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }

  async requestExtension(orgId: string, dto: RequestExtensionDto, actorUserId?: string) {
    if (!dto.bookingId && !dto.partnerRentalId) {
      throw new BadRequestException('Extension must target a booking or partner rental');
    }

    let previousReturn: Date;
    let dailyRate: Decimal;

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, organizationId: orgId },
      });
      if (!booking) throw new NotFoundException('Booking not found in organization');
      previousReturn = booking.returnDateTime;
      dailyRate = dto.customDailyRate !== undefined ? new Decimal(dto.customDailyRate) : new Decimal(booking.dailyRate.toString());
    } else {
      const rental = await this.prisma.partnerRental.findFirst({
        where: {
          id: dto.partnerRentalId,
          OR: [{ supplyingOrganizationId: orgId }, { requestingOrganizationId: orgId }],
        },
      });
      if (!rental) throw new NotFoundException('Partner rental record not found');
      previousReturn = rental.returnDateTime;
      dailyRate = dto.customDailyRate !== undefined ? new Decimal(dto.customDailyRate) : new Decimal(rental.partnerDailyRate.toString());
    }

    const newReturn = new Date(dto.newReturnDateTime);
    if (newReturn.getTime() <= previousReturn.getTime()) {
      throw new BadRequestException('New return date & time must be strictly after previous return date & time');
    }

    const extraDays = this.calculateDays(previousReturn, newReturn);
    const additionalAmount = dailyRate.mul(extraDays);

    const extension = await this.prisma.rentalExtension.create({
      data: {
        organizationId: orgId,
        bookingId: dto.bookingId,
        partnerRentalId: dto.partnerRentalId,
        previousReturnDateTime: previousReturn,
        newReturnDateTime: newReturn,
        additionalDailyRate: new Prisma.Decimal(dailyRate.toFixed(2)),
        additionalAmount: new Prisma.Decimal(additionalAmount.toFixed(2)),
        reason: dto.reason,
        status: ExtensionStatus.PENDING,
      },
    });

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'REQUEST_RENTAL_EXTENSION',
      entityType: 'RentalExtension',
      entityId: extension.id,
      newValue: extension,
    });

    return extension;
  }

  async approveExtension(orgId: string, id: string, actorUserId?: string) {
    const extension = await this.prisma.rentalExtension.findFirst({
      where: { id, organizationId: orgId },
      include: {
        booking: true,
        partnerRental: true,
      },
    });

    if (!extension) {
      throw new NotFoundException('Extension request not found');
    }

    if (extension.status !== ExtensionStatus.PENDING) {
      throw new BadRequestException(`Extension is already ${extension.status}`);
    }

    const vehicleId = extension.booking?.vehicleId || extension.partnerRental?.vehicleId;
    if (!vehicleId) {
      throw new BadRequestException('Target vehicle for extension could not be resolved');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Transaction-safe availability check for the extended duration
      await this.availabilityService.assertVehicleAvailable(
        tx,
        vehicleId,
        extension.previousReturnDateTime,
        extension.newReturnDateTime,
        {
          excludeBookingId: extension.bookingId || undefined,
          excludePartnerRentalId: extension.partnerRentalId || undefined,
        },
      );

      // 2. Update Direct Booking or Partner Rental
      if (extension.booking) {
        const booking = extension.booking;
        const newTotalDays = this.calculateDays(booking.pickupDateTime, extension.newReturnDateTime);
        const addedAmount = new Decimal(extension.additionalAmount.toString());
        const newSubtotal = new Decimal(booking.subtotal.toString()).plus(addedAmount);
        const newTotal = new Decimal(booking.totalAmount.toString()).plus(addedAmount);
        const newBalance = new Decimal(booking.balanceAmount.toString()).plus(addedAmount);

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            returnDateTime: extension.newReturnDateTime,
            numberOfDays: newTotalDays,
            subtotal: new Prisma.Decimal(newSubtotal.toFixed(2)),
            totalAmount: new Prisma.Decimal(newTotal.toFixed(2)),
            balanceAmount: new Prisma.Decimal(newBalance.toFixed(2)),
            paymentStatus: newBalance.greaterThan(0) ? 'PARTIALLY_PAID' : booking.paymentStatus,
          },
        });

        // Financial Ledger entry for additional rental charge
        await tx.financialTransaction.create({
          data: {
            organizationId: orgId,
            vehicleId: booking.vehicleId,
            bookingId: booking.id,
            type: TransactionType.INCOME,
            category: TransactionCategory.DIRECT_RENTAL,
            amount: new Prisma.Decimal(addedAmount.toFixed(2)),
            currency: 'USD',
            paymentMethod: 'INVOICE_RECEIVABLE',
            notes: `Approved Extension #${extension.id} (${booking.bookingNumber})`,
          },
        });
      } else if (extension.partnerRental) {
        const rental = extension.partnerRental;
        const newTotalDays = this.calculateDays(rental.handoverDateTime, extension.newReturnDateTime);
        const addedAmount = new Decimal(extension.additionalAmount.toString());
        const newSubtotal = new Decimal(rental.subtotal.toString()).plus(addedAmount);
        const newTotal = new Decimal(rental.totalAmount.toString()).plus(addedAmount);
        const newBalance = new Decimal(rental.balanceAmount.toString()).plus(addedAmount);

        await tx.partnerRental.update({
          where: { id: rental.id },
          data: {
            returnDateTime: extension.newReturnDateTime,
            numberOfDays: newTotalDays,
            subtotal: new Prisma.Decimal(newSubtotal.toFixed(2)),
            totalAmount: new Prisma.Decimal(newTotal.toFixed(2)),
            balanceAmount: new Prisma.Decimal(newBalance.toFixed(2)),
            paymentStatus: newBalance.greaterThan(0) ? 'PARTIALLY_PAID' : rental.paymentStatus,
          },
        });
      }

      // 3. Mark extension approved
      const updatedExtension = await tx.rentalExtension.update({
        where: { id },
        data: {
          status: ExtensionStatus.APPROVED,
          approvedByUserId: actorUserId,
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'APPROVE_RENTAL_EXTENSION',
          entityType: 'RentalExtension',
          entityId: extension.id,
          previousValue: extension,
          newValue: updatedExtension,
        },
        tx,
      );

      return updatedExtension;
    });
  }

  async rejectExtension(orgId: string, id: string, dto: RejectExtensionDto, actorUserId?: string) {
    const extension = await this.prisma.rentalExtension.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!extension) {
      throw new NotFoundException('Extension request not found');
    }

    const updated = await this.prisma.rentalExtension.update({
      where: { id },
      data: {
        status: ExtensionStatus.REJECTED,
        reason: `${extension.reason || ''}\n[Rejected]: ${dto.reason}`.trim(),
      },
    });

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'REJECT_RENTAL_EXTENSION',
      entityType: 'RentalExtension',
      entityId: extension.id,
      previousValue: extension,
      newValue: updated,
    });

    return updated;
  }

  async cancelExtension(orgId: string, id: string, actorUserId?: string) {
    const extension = await this.prisma.rentalExtension.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!extension) {
      throw new NotFoundException('Extension request not found');
    }

    if (extension.status !== ExtensionStatus.PENDING) {
      throw new BadRequestException('Only pending extension requests can be cancelled');
    }

    const updated = await this.prisma.rentalExtension.update({
      where: { id },
      data: {
        status: ExtensionStatus.CANCELLED,
      },
    });

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'CANCEL_RENTAL_EXTENSION',
      entityType: 'RentalExtension',
      entityId: extension.id,
      previousValue: extension,
      newValue: updated,
    });

    return updated;
  }

  async listExtensions(orgId: string, bookingId?: string, partnerRentalId?: string) {
    return this.prisma.rentalExtension.findMany({
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
}
