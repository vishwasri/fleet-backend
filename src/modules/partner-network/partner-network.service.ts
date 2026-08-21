import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  Prisma,
  PartnerOfferStatus,
  PartnerRelationshipStatus,
  PartnerRentalStatus,
  PartnerRequestStatus,
  PaymentStatus,
  TransactionCategory,
  TransactionType,
  VehicleStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { InvitePartnerDto, RespondPartnerInviteDto } from './dto/partner-relationship.dto';
import { CreatePartnerRequestDto } from './dto/partner-request.dto';
import { SubmitPartnerOfferDto } from './dto/partner-offer.dto';
import { PartnerHandoverDto, PartnerReturnDto, SettlePartnerRentalDto } from './dto/partner-rental-ops.dto';
import { MoneyUtil } from '../../common/utils/money.util';
import Decimal from 'decimal.js';

import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class PartnerNetworkService {
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

  // ==========================================
  // PARTNER RELATIONSHIPS & DIRECTORY
  // ==========================================

  async getConnectedPartners(orgId: string) {
    const [asInitiator, asTarget] = await Promise.all([
      this.prisma.partnerRelationship.findMany({
        where: { requestingOrganizationId: orgId, status: PartnerRelationshipStatus.ACTIVE },
        include: {
          supplyingOrg: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              address: true,
              logoUrl: true,
            },
          },
        },
      }),
      this.prisma.partnerRelationship.findMany({
        where: { supplyingOrganizationId: orgId, status: PartnerRelationshipStatus.ACTIVE },
        include: {
          requestingOrg: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              address: true,
              logoUrl: true,
            },
          },
        },
      }),
    ]);

    const partners = [
      ...asInitiator.map((r) => ({
        relationshipId: r.id,
        partner: r.supplyingOrg,
        status: r.status,
        connectedSince: r.createdAt,
      })),
      ...asTarget.map((r) => ({
        relationshipId: r.id,
        partner: r.requestingOrg,
        status: r.status,
        connectedSince: r.createdAt,
      })),
    ];

    return partners;
  }

  async getIncomingInvitations(orgId: string) {
    return this.prisma.partnerRelationship.findMany({
      where: {
        supplyingOrganizationId: orgId,
        status: PartnerRelationshipStatus.PENDING,
      },
      include: {
        requestingOrg: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            address: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  async invitePartner(orgId: string, dto: InvitePartnerDto) {
    if (orgId === dto.targetOrganizationId) {
      throw new BadRequestException('Cannot establish partnership with your own organization');
    }

    const targetOrg = await this.prisma.organization.findUnique({
      where: { id: dto.targetOrganizationId },
    });

    if (!targetOrg) {
      throw new NotFoundException('Target partner organization not found');
    }

    // Check existing
    const existing = await this.prisma.partnerRelationship.findFirst({
      where: {
        OR: [
          { requestingOrganizationId: orgId, supplyingOrganizationId: dto.targetOrganizationId },
          { requestingOrganizationId: dto.targetOrganizationId, supplyingOrganizationId: orgId },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(`Partnership relationship already exists with status: ${existing.status}`);
    }

    return this.prisma.partnerRelationship.create({
      data: {
        requestingOrganizationId: orgId,
        supplyingOrganizationId: dto.targetOrganizationId,
        invitedByOrganizationId: orgId,
        status: PartnerRelationshipStatus.PENDING,
        notes: dto.notes,
      },
    });
  }

  async respondToInvite(orgId: string, relationshipId: string, dto: RespondPartnerInviteDto) {
    const relationship = await this.prisma.partnerRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship || relationship.supplyingOrganizationId !== orgId) {
      throw new NotFoundException('Partner invitation not found for your organization');
    }

    return this.prisma.partnerRelationship.update({
      where: { id: relationshipId },
      data: { status: dto.status },
    });
  }

  // ==========================================
  // PARTNER REQUESTS & OFFERS
  // ==========================================

  async createPartnerRequest(orgId: string, dto: CreatePartnerRequestDto) {
    this.availabilityService.validateDateRange(dto.pickupDateTime, dto.returnDateTime);

    return this.prisma.partnerRequest.create({
      data: {
        requestingOrganizationId: orgId,
        vehicleCategory: dto.vehicleCategory,
        targetWholesaleRate: new Prisma.Decimal(dto.targetWholesaleRate),
        pickupDateTime: dto.pickupDateTime,
        returnDateTime: dto.returnDateTime,
        pickupLocation: dto.pickupLocation,
        returnLocation: dto.returnLocation,
        notes: dto.notes,
        status: PartnerRequestStatus.OPEN,
      },
    });
  }

  async listPartnerRequests(orgId: string, filter: 'mine' | 'network' = 'network') {
    if (filter === 'mine') {
      return this.prisma.partnerRequest.findMany({
        where: { requestingOrganizationId: orgId },
        include: {
          offers: {
            include: {
              supplyingOrg: {
                select: { id: true, displayName: true, logoUrl: true },
              },
              vehicle: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  year: true,
                  category: true,
                  seats: true,
                  transmission: true,
                  fuelType: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Network open requests: requests from connected active partners
    const activePartnerships = await this.prisma.partnerRelationship.findMany({
      where: {
        status: PartnerRelationshipStatus.ACTIVE,
        OR: [{ requestingOrganizationId: orgId }, { supplyingOrganizationId: orgId }],
      },
    });

    const partnerOrgIds = activePartnerships.map((p) =>
      p.requestingOrganizationId === orgId ? p.supplyingOrganizationId : p.requestingOrganizationId,
    );

    return this.prisma.partnerRequest.findMany({
      where: {
        requestingOrganizationId: { in: partnerOrgIds },
        status: { in: [PartnerRequestStatus.OPEN, PartnerRequestStatus.OFFERS_RECEIVED] },
      },
      include: {
        requestingOrg: {
          select: { id: true, displayName: true, logoUrl: true, address: true },
        },
        offers: {
          where: { supplyingOrganizationId: orgId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitPartnerOffer(orgId: string, requestId: string, dto: SubmitPartnerOfferDto) {
    const request = await this.prisma.partnerRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Partner request not found');
    }

    if (request.requestingOrganizationId === orgId) {
      throw new BadRequestException('Cannot submit offer to your own request');
    }

    // Verify supplier owns the vehicle
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: orgId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in your fleet');
    }

    // Check vehicle availability for requested dates
    await this.availabilityService.assertVehicleAvailable(
      this.prisma,
      dto.vehicleId,
      request.pickupDateTime,
      request.returnDateTime,
    );

    const numberOfDays = this.calculateDays(request.pickupDateTime, request.returnDateTime);
    const dailyRate = new Decimal(dto.dailyRate);
    const subtotal = dailyRate.mul(numberOfDays);
    const deposit = new Decimal(dto.depositAmount || 0);
    const totalAmount = subtotal.plus(deposit);

    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.partnerOffer.create({
        data: {
          requestId,
          supplyingOrganizationId: orgId,
          vehicleId: dto.vehicleId,
          dailyRate: new Prisma.Decimal(dailyRate.toFixed(2)),
          depositAmount: new Prisma.Decimal(deposit.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          status: PartnerOfferStatus.PENDING,
          notes: dto.notes,
          validUntil: dto.validUntil,
        },
        include: {
          vehicle: true,
        },
      });

      await tx.partnerRequest.update({
        where: { id: requestId },
        data: { status: PartnerRequestStatus.OFFERS_RECEIVED },
      });

      return offer;
    });
  }

  async acceptPartnerOffer(orgId: string, offerId: string) {
    const offer = await this.prisma.partnerOffer.findUnique({
      where: { id: offerId },
      include: {
        partnerRequest: true,
        vehicle: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Partner offer not found');
    }

    if (offer.partnerRequest.requestingOrganizationId !== orgId) {
      throw new ForbiddenException('Only the requesting organization can accept this offer');
    }

    if (offer.status !== PartnerOfferStatus.PENDING) {
      throw new BadRequestException(`Offer is already ${offer.status}`);
    }

    const request = offer.partnerRequest;
    const numberOfDays = this.calculateDays(request.pickupDateTime, request.returnDateTime);
    const dailyRate = new Decimal(offer.dailyRate.toString());
    const subtotal = dailyRate.mul(numberOfDays);
    const deposit = new Decimal(offer.depositAmount.toString());
    const totalAmount = subtotal.plus(deposit);

    return this.prisma.$transaction(async (tx) => {
      // 1. Transaction-safe availability assertion for supplier vehicle
      await this.availabilityService.assertVehicleAvailable(
        tx,
        offer.vehicleId,
        request.pickupDateTime,
        request.returnDateTime,
      );

      // 2. Create PartnerRental
      const partnerRental = await tx.partnerRental.create({
        data: {
          supplyingOrganizationId: offer.supplyingOrganizationId,
          requestingOrganizationId: orgId,
          vehicleId: offer.vehicleId,
          offerId: offer.id,
          partnerDailyRate: offer.dailyRate,
          numberOfDays,
          subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
          depositAmount: offer.depositAmount,
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          paidAmount: new Prisma.Decimal(0),
          balanceAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          paymentStatus: PaymentStatus.UNPAID,
          status: PartnerRentalStatus.ACCEPTED,
          handoverDateTime: request.pickupDateTime,
          returnDateTime: request.returnDateTime,
          pickupLocation: request.pickupLocation,
          returnLocation: request.returnLocation,
        },
      });

      // 3. Mark offer accepted
      await tx.partnerOffer.update({
        where: { id: offer.id },
        data: { status: PartnerOfferStatus.ACCEPTED },
      });

      // 4. Mark request fulfilled
      await tx.partnerRequest.update({
        where: { id: request.id },
        data: { status: PartnerRequestStatus.FULFILLED },
      });

      // 5. Reject other offers for this request
      await tx.partnerOffer.updateMany({
        where: {
          requestId: request.id,
          id: { not: offer.id },
        },
        data: { status: PartnerOfferStatus.REJECTED },
      });

      return partnerRental;
    });
  }

  // ==========================================
  // PARTNER RENTALS & PRIVACY-SAFE OPERATIONS
  // ==========================================

  async listPartnerRentals(orgId: string, role: 'supplier' | 'requester' | 'all' = 'all') {
    const where: Prisma.PartnerRentalWhereInput = {};

    if (role === 'supplier') {
      where.supplyingOrganizationId = orgId;
    } else if (role === 'requester') {
      where.requestingOrganizationId = orgId;
    } else {
      where.OR = [
        { supplyingOrganizationId: orgId },
        { requestingOrganizationId: orgId },
      ];
    }

    return this.prisma.partnerRental.findMany({
      where,
      include: {
        supplyingOrg: {
          select: { id: true, displayName: true, email: true, phone: true },
        },
        requestingOrg: {
          select: { id: true, displayName: true, email: true, phone: true },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            category: true,
            registrationNumber: true,
          },
        },
      },
      orderBy: { handoverDateTime: 'desc' },
    });
  }

  async getPartnerRentalDetails(orgId: string, id: string) {
    const rental = await this.prisma.partnerRental.findFirst({
      where: {
        id,
        OR: [
          { supplyingOrganizationId: orgId },
          { requestingOrganizationId: orgId },
        ],
      },
      include: {
        supplyingOrg: {
          select: { id: true, displayName: true, email: true, phone: true, address: true },
        },
        requestingOrg: {
          select: { id: true, displayName: true, email: true, phone: true, address: true },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            category: true,
            registrationNumber: true,
            seats: true,
            fuelType: true,
            transmission: true,
          },
        },
        payments: true,
        transactions: true,
      },
    });

    if (!rental) {
      throw new NotFoundException('Partner rental record not found or access denied');
    }

    // PRIVACY ENFORCEMENT: Ensure zero end-customer records are present or returned
    return rental;
  }

  async partnerHandover(orgId: string, id: string, dto: PartnerHandoverDto) {
    const rental = await this.prisma.partnerRental.findFirst({
      where: { id, supplyingOrganizationId: orgId },
    });

    if (!rental) {
      throw new NotFoundException('Partner rental not found as supplying organization');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partnerRental.update({
        where: { id },
        data: {
          handoverMileage: dto.handoverMileage,
          handoverFuelLevel: dto.handoverFuelLevel,
          handoverPhotos: dto.handoverPhotos ? JSON.stringify(dto.handoverPhotos) : undefined,
          status: PartnerRentalStatus.HANDED_OVER,
          notes: dto.notes ? `${rental.notes || ''}\n[Handover]: ${dto.notes}`.trim() : rental.notes,
        },
      });

      // Update vehicle status & mileage
      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: {
          mileage: dto.handoverMileage,
          status: VehicleStatus.PARTNER_RENTAL,
        },
      });

      return updated;
    });
  }

  async partnerReturn(orgId: string, id: string, dto: PartnerReturnDto) {
    const rental = await this.prisma.partnerRental.findFirst({
      where: { id, supplyingOrganizationId: orgId },
    });

    if (!rental) {
      throw new NotFoundException('Partner rental not found as supplying organization');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partnerRental.update({
        where: { id },
        data: {
          returnMileage: dto.returnMileage,
          returnFuelLevel: dto.returnFuelLevel,
          returnPhotos: dto.returnPhotos ? JSON.stringify(dto.returnPhotos) : undefined,
          damageNotes: dto.damageNotes,
          status: PartnerRentalStatus.RETURNED,
          notes: dto.notes ? `${rental.notes || ''}\n[Return]: ${dto.notes}`.trim() : rental.notes,
        },
      });

      // Reset vehicle status & update mileage
      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: {
          mileage: dto.returnMileage,
          status: VehicleStatus.AVAILABLE,
        },
      });

      return updated;
    });
  }

  async settlePartnerRental(orgId: string, id: string, dto: SettlePartnerRentalDto) {
    const rental = await this.prisma.partnerRental.findFirst({
      where: {
        id,
        OR: [{ supplyingOrganizationId: orgId }, { requestingOrganizationId: orgId }],
      },
    });

    if (!rental) {
      throw new NotFoundException('Partner rental record not found');
    }

    const settleAmount = new Decimal(dto.amount);
    const currentPaid = new Decimal(rental.paidAmount.toString());
    const totalAmount = new Decimal(rental.totalAmount.toString());
    const newPaid = currentPaid.plus(settleAmount);
    const newBalance = totalAmount.minus(newPaid);

    let paymentStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;
    let rentalStatus = rental.status;

    if (newPaid.gte(totalAmount)) {
      paymentStatus = PaymentStatus.PAID;
      if (rental.status === PartnerRentalStatus.RETURNED) {
        rentalStatus = PartnerRentalStatus.SETTLED;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Supplier Financial Transaction (INCOME)
      await tx.financialTransaction.create({
        data: {
          organizationId: rental.supplyingOrganizationId,
          vehicleId: rental.vehicleId,
          partnerRentalId: rental.id,
          type: TransactionType.INCOME,
          category: TransactionCategory.PARTNER_RENTAL,
          amount: new Prisma.Decimal(settleAmount.toFixed(2)),
          currency: 'USD',
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          notes: `B2B Partner Wholesale Settlement from Requester`,
        },
      });

      // 2. Create Requester Financial Transaction (EXPENSE)
      await tx.financialTransaction.create({
        data: {
          organizationId: rental.requestingOrganizationId,
          partnerRentalId: rental.id,
          type: TransactionType.EXPENSE,
          category: TransactionCategory.OTHER_EXPENSE,
          amount: new Prisma.Decimal(settleAmount.toFixed(2)),
          currency: 'USD',
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          notes: `B2B Partner Wholesale Expense to Supplier`,
        },
      });

      // 3. Update Partner Rental
      return tx.partnerRental.update({
        where: { id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid.toFixed(2)),
          balanceAmount: new Prisma.Decimal(newBalance.toFixed(2)),
          paymentStatus,
          status: rentalStatus,
        },
        include: {
          supplyingOrg: { select: { displayName: true } },
          requestingOrg: { select: { displayName: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
      });
    });
  }

  async cancelPartnerRental(orgId: string, id: string, reason?: string, actorUserId?: string) {
    const rental = await this.prisma.partnerRental.findFirst({
      where: {
        id,
        OR: [{ supplyingOrganizationId: orgId }, { requestingOrganizationId: orgId }],
      },
    });

    if (!rental) {
      throw new NotFoundException('Partner rental record not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partnerRental.update({
        where: { id },
        data: {
          status: PartnerRentalStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      // Reset vehicle status if it was active/handed over
      if (
        rental.status === PartnerRentalStatus.HANDED_OVER ||
        rental.status === PartnerRentalStatus.ACTIVE
      ) {
        await tx.vehicle.update({
          where: { id: rental.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
      }

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: 'CANCEL_PARTNER_RENTAL',
          entityType: 'PartnerRental',
          entityId: id,
          previousValue: rental,
          newValue: updated,
        },
        tx,
      );

      return updated;
    });
  }
}
