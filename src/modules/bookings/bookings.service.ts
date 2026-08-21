import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  BookingStatus,
  PaymentStatus,
  TransactionCategory,
  TransactionType,
  VehicleStatus,
  DepositStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AuditLogService } from '../audit/audit-log.service';
import { SettingsService } from '../settings/settings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  AddBookingPaymentDto,
  BookingQueryDto,
  PickupHandoverDto,
  ReturnInspectionDto,
  UpdateBookingDto,
} from './dto/booking-query.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { MarkNoShowDto } from './dto/no-show.dto';
import { MoneyUtil } from '../../common/utils/money.util';
import { BookingNumberUtil } from '../../common/utils/booking-number.util';
import Decimal from 'decimal.js';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private auditLogService: AuditLogService,
    private settingsService: SettingsService,
  ) {}

  private calculateDays(start: Date, end: Date): number {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }

  async create(orgId: string, dto: CreateBookingDto, actorUserId?: string) {
    this.availabilityService.validateDateRange(dto.pickupDateTime, dto.returnDateTime);

    // 1. Verify customer profile belongs to organization
    const customer = await this.prisma.customerProfile.findFirst({
      where: { id: dto.customerProfileId, organizationId: orgId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found in your organization');
    }

    // 2. Verify vehicle belongs to organization
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: orgId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in your organization');
    }

    const rateToUse = dto.customDailyRate !== undefined ? dto.customDailyRate : Number(vehicle.dailyRate);
    const numberOfDays = this.calculateDays(dto.pickupDateTime, dto.returnDateTime);
    const pricing = MoneyUtil.calculateRentalPricing(
      rateToUse,
      numberOfDays,
      dto.discountAmount || 0,
      dto.depositAmount || 0,
    );

    const bookingNumber = BookingNumberUtil.generateDirectBookingNumber();

    return this.prisma.$transaction(async (tx) => {
      // 3. Central availability check (including document compliance check) inside transaction
      await this.availabilityService.assertVehicleAvailable(
        tx,
        dto.vehicleId,
        dto.pickupDateTime,
        dto.returnDateTime,
      );

      // 4. Create booking
      const booking = await tx.booking.create({
        data: {
          organizationId: orgId,
          customerProfileId: dto.customerProfileId,
          vehicleId: dto.vehicleId,
          bookingSource: dto.bookingSource || 'INTERNAL',
          bookingNumber,
          pickupDateTime: dto.pickupDateTime,
          returnDateTime: dto.returnDateTime,
          pickupLocation: dto.pickupLocation,
          returnLocation: dto.returnLocation,
          dailyRate: pricing.dailyRate,
          numberOfDays,
          discountAmount: pricing.discountAmount,
          subtotal: pricing.subtotal,
          depositAmount: pricing.depositAmount,
          totalAmount: pricing.totalAmount,
          paidAmount: pricing.paidAmount,
          balanceAmount: pricing.balanceAmount,
          paymentStatus: PaymentStatus.UNPAID,
          bookingStatus: dto.bookingStatus || BookingStatus.CONFIRMED,
          notes: dto.notes,
        },
        include: {
          vehicle: true,
          customerProfile: true,
        },
      });

      // 5. Create Deposit record if deposit is defined
      if (new Decimal(pricing.depositAmount.toString()).greaterThan(0)) {
        await tx.deposit.create({
          data: {
            organizationId: orgId,
            bookingId: booking.id,
            amount: pricing.depositAmount,
            currency: 'USD',
            status: DepositStatus.PENDING,
            notes: `Security deposit for Booking #${booking.bookingNumber}`,
          },
        });
      }

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'CREATE_BOOKING',
          entityType: 'Booking',
          entityId: booking.id,
          newValue: booking,
        },
        tx,
      );

      return booking;
    });
  }

  async findAll(orgId: string, query: BookingQueryDto) {
    const where: Prisma.BookingWhereInput = {
      organizationId: orgId,
      bookingStatus: query.bookingStatus,
      paymentStatus: query.paymentStatus,
      vehicleId: query.vehicleId,
      customerProfileId: query.customerProfileId,
    };

    if (query.startDate || query.endDate) {
      where.pickupDateTime = {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: query.endDate ? new Date(query.endDate) : undefined,
      };
    }

    if (query.search) {
      where.OR = [
        { bookingNumber: { contains: query.search } },
        { customerProfile: { firstName: { contains: query.search } } },
        { customerProfile: { lastName: { contains: query.search } } },
        { customerProfile: { phone: { contains: query.search } } },
        { vehicle: { registrationNumber: { contains: query.search } } },
        { vehicle: { make: { contains: query.search } } },
        { vehicle: { model: { contains: query.search } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip: query.skip,
        take: query.take,
        include: {
          customerProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              registrationNumber: true,
              category: true,
            },
          },
          deposits: true,
          extensions: true,
          extraCharges: true,
        },
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

  async findOne(orgId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customerProfile: true,
        vehicle: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
        deposits: true,
        extensions: true,
        extraCharges: true,
        inspections: {
          include: { items: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found in this organization`);
    }

    return booking;
  }

  async update(orgId: string, id: string, dto: UpdateBookingDto, actorUserId?: string) {
    const booking = await this.findOne(orgId, id);

    const newPickup = dto.pickupDateTime ? new Date(dto.pickupDateTime) : booking.pickupDateTime;
    const newReturn = dto.returnDateTime ? new Date(dto.returnDateTime) : booking.returnDateTime;
    const newVehicleId = dto.vehicleId || booking.vehicleId;

    return this.prisma.$transaction(async (tx) => {
      // Check availability if dates or vehicle changed
      if (
        dto.pickupDateTime ||
        dto.returnDateTime ||
        (dto.vehicleId && dto.vehicleId !== booking.vehicleId)
      ) {
        await this.availabilityService.assertVehicleAvailable(
          tx,
          newVehicleId,
          newPickup,
          newReturn,
          { excludeBookingId: id },
        );
      }

      const numberOfDays = this.calculateDays(newPickup, newReturn);
      const rate = dto.customDailyRate !== undefined ? dto.customDailyRate : Number(booking.dailyRate);
      const discount = dto.discountAmount !== undefined ? dto.discountAmount : Number(booking.discountAmount);
      const deposit = dto.depositAmount !== undefined ? dto.depositAmount : Number(booking.depositAmount);

      const pricing = MoneyUtil.calculateRentalPricing(rate, numberOfDays, discount, deposit);
      const paid = new Decimal(booking.paidAmount.toString());
      const total = new Decimal(pricing.totalAmount.toString());
      const balance = total.minus(paid);

      let paymentStatus = booking.paymentStatus;
      if (paid.gte(total) && total.greaterThan(0)) {
        paymentStatus = PaymentStatus.PAID;
      } else if (paid.greaterThan(0) && paid.lt(total)) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      } else if (paid.isZero()) {
        paymentStatus = PaymentStatus.UNPAID;
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          customerProfileId: dto.customerProfileId || booking.customerProfileId,
          vehicleId: newVehicleId,
          pickupDateTime: newPickup,
          returnDateTime: newReturn,
          pickupLocation: dto.pickupLocation || booking.pickupLocation,
          returnLocation: dto.returnLocation || booking.returnLocation,
          dailyRate: pricing.dailyRate,
          numberOfDays,
          discountAmount: pricing.discountAmount,
          subtotal: pricing.subtotal,
          depositAmount: pricing.depositAmount,
          totalAmount: pricing.totalAmount,
          balanceAmount: new Prisma.Decimal(balance.toFixed(2)),
          paymentStatus,
          bookingStatus: dto.bookingStatus || booking.bookingStatus,
          notes: dto.notes !== undefined ? dto.notes : booking.notes,
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'UPDATE_BOOKING',
          entityType: 'Booking',
          entityId: id,
          previousValue: booking,
          newValue: updated,
        },
        tx,
      );

      return updated;
    });
  }

  async pickupHandover(orgId: string, id: string, dto: PickupHandoverDto, actorUserId?: string) {
    const booking = await this.findOne(orgId, id);

    if (
      booking.bookingStatus !== BookingStatus.CONFIRMED &&
      booking.bookingStatus !== BookingStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException(`Cannot pickup booking in status ${booking.bookingStatus}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          pickupMileage: dto.pickupMileage,
          pickupFuelLevel: dto.pickupFuelLevel,
          bookingStatus: BookingStatus.PICKED_UP,
          notes: dto.notes ? `${booking.notes || ''}\n[Pickup]: ${dto.notes}`.trim() : booking.notes,
        },
      });

      // Update vehicle status & mileage
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: {
          mileage: dto.pickupMileage,
          status: VehicleStatus.DIRECT_RENTAL,
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'PICKUP_BOOKING',
          entityType: 'Booking',
          entityId: id,
          previousValue: booking,
          newValue: updatedBooking,
        },
        tx,
      );

      return updatedBooking;
    });
  }

  async returnInspection(orgId: string, id: string, dto: ReturnInspectionDto, actorUserId?: string) {
    const booking = await this.findOne(orgId, id);

    // Check inspection requirement
    const settings = await this.settingsService.getSettings(orgId);
    if (settings.requireInspectionOnReturn) {
      const returnInspectionExists = await this.prisma.vehicleInspection.findFirst({
        where: { bookingId: id, type: 'DIRECT_RETURN' },
      });
      // If none found and no mileage passed, prompt inspection or proceed with recorded inspection
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          returnMileage: dto.returnMileage,
          returnFuelLevel: dto.returnFuelLevel,
          bookingStatus: BookingStatus.COMPLETED,
          notes: dto.notes ? `${booking.notes || ''}\n[Return]: ${dto.notes}`.trim() : booking.notes,
        },
      });

      // Update vehicle mileage and set back to AVAILABLE
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: {
          mileage: dto.returnMileage,
          status: VehicleStatus.AVAILABLE,
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'RETURN_BOOKING',
          entityType: 'Booking',
          entityId: id,
          previousValue: booking,
          newValue: updatedBooking,
        },
        tx,
      );

      return updatedBooking;
    });
  }

  async cancelBooking(orgId: string, id: string, dto?: CancelBookingDto, actorUserId?: string) {
    const booking = await this.findOne(orgId, id);

    return this.prisma.$transaction(async (tx) => {
      const fee = dto?.cancellationFeeAmount ? new Decimal(dto.cancellationFeeAmount) : new Decimal(0);
      const refund = dto?.refundableAmount ? new Decimal(dto.refundableAmount) : new Decimal(0);

      // Post cancellation fee to income
      if (fee.greaterThan(0)) {
        await tx.financialTransaction.create({
          data: {
            organizationId: orgId,
            vehicleId: booking.vehicleId,
            bookingId: booking.id,
            type: TransactionType.INCOME,
            category: TransactionCategory.CANCELLATION_FEE,
            amount: new Prisma.Decimal(fee.toFixed(2)),
            currency: 'USD',
            paymentMethod: 'CANCELLATION_POLICY',
            notes: `Cancellation fee for Booking #${booking.bookingNumber}`,
          },
        });
      }

      // Post refund to expense
      if (refund.greaterThan(0)) {
        await tx.financialTransaction.create({
          data: {
            organizationId: orgId,
            vehicleId: booking.vehicleId,
            bookingId: booking.id,
            type: TransactionType.EXPENSE,
            category: TransactionCategory.REFUND,
            amount: new Prisma.Decimal(refund.toFixed(2)),
            currency: 'USD',
            paymentMethod: 'REFUND_ORIGINAL',
            notes: `Cancellation refund for Booking #${booking.bookingNumber}`,
          },
        });
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          cancellationReason: dto?.reason,
          cancelledAt: new Date(),
          cancelledByUserId: actorUserId,
          cancellationFeeAmount: fee.greaterThan(0) ? new Prisma.Decimal(fee.toFixed(2)) : undefined,
          refundableAmount: refund.greaterThan(0) ? new Prisma.Decimal(refund.toFixed(2)) : undefined,
        },
      });

      // Reset vehicle status if it was picked up/active
      if (booking.bookingStatus === BookingStatus.PICKED_UP || booking.bookingStatus === BookingStatus.ACTIVE) {
        await tx.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
      }

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'CANCEL_BOOKING',
          entityType: 'Booking',
          entityId: id,
          previousValue: booking,
          newValue: updated,
        },
        tx,
      );

      return updated;
    });
  }

  async markNoShow(orgId: string, id: string, dto?: MarkNoShowDto, actorUserId?: string) {
    const booking = await this.findOne(orgId, id);

    return this.prisma.$transaction(async (tx) => {
      const fee = dto?.noShowFeeAmount ? new Decimal(dto.noShowFeeAmount) : new Decimal(0);

      if (fee.greaterThan(0)) {
        await tx.financialTransaction.create({
          data: {
            organizationId: orgId,
            vehicleId: booking.vehicleId,
            bookingId: booking.id,
            type: TransactionType.INCOME,
            category: TransactionCategory.NO_SHOW_FEE,
            amount: new Prisma.Decimal(fee.toFixed(2)),
            currency: 'USD',
            paymentMethod: 'NO_SHOW_PENALTY',
            notes: `No-Show penalty fee for Booking #${booking.bookingNumber}`,
          },
        });
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          bookingStatus: BookingStatus.NO_SHOW,
          noShowAt: new Date(),
          noShowFeeAmount: fee.greaterThan(0) ? new Prisma.Decimal(fee.toFixed(2)) : undefined,
          notes: dto?.notes ? `${booking.notes || ''}\n[No-Show]: ${dto.notes}`.trim() : booking.notes,
        },
      });

      // Ensure vehicle status is available
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'NO_SHOW_BOOKING',
          entityType: 'Booking',
          entityId: id,
          previousValue: booking,
          newValue: updated,
        },
        tx,
      );

      return updated;
    });
  }

  async addPayment(orgId: string, id: string, dto: AddBookingPaymentDto, actorUserId?: string) {
    const booking = await this.findOne(orgId, id);

    const paymentAmount = new Decimal(dto.amount);
    const currentPaid = new Decimal(booking.paidAmount.toString());
    const totalAmount = new Decimal(booking.totalAmount.toString());

    const newPaid = currentPaid.plus(paymentAmount);
    const newBalance = totalAmount.minus(newPaid);

    let paymentStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;
    if (newPaid.gte(totalAmount)) {
      paymentStatus = PaymentStatus.PAID;
    } else if (newPaid.isZero()) {
      paymentStatus = PaymentStatus.UNPAID;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          organizationId: orgId,
          bookingId: id,
          amount: new Prisma.Decimal(paymentAmount.toFixed(2)),
          currency: 'USD',
          status: 'COMPLETED',
          paymentMethod: dto.paymentMethod,
          transactionReference: dto.reference,
        },
      });

      // 2. Create Financial Transaction (Income)
      await tx.financialTransaction.create({
        data: {
          organizationId: orgId,
          vehicleId: booking.vehicleId,
          bookingId: id,
          type: TransactionType.INCOME,
          category: TransactionCategory.DIRECT_RENTAL,
          amount: new Prisma.Decimal(paymentAmount.toFixed(2)),
          currency: 'USD',
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          notes: dto.notes || `Direct Rental Payment for Booking #${booking.bookingNumber}`,
        },
      });

      // 3. Update Booking balances
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid.toFixed(2)),
          balanceAmount: new Prisma.Decimal(newBalance.toFixed(2)),
          paymentStatus,
        },
        include: {
          payments: true,
          transactions: true,
        },
      });

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'ADD_BOOKING_PAYMENT',
          entityType: 'Booking',
          entityId: id,
          metadata: { amount: paymentAmount.toFixed(2) },
        },
        tx,
      );

      return {
        booking: updatedBooking,
        payment,
      };
    });
  }
}
