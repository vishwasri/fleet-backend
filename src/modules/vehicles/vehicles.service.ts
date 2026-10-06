import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TransactionCategory, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { CreateVehicleCategoryDto, UpdateVehicleCategoryDto } from './dto/vehicle-category.dto';
import Decimal from 'decimal.js';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        organizationId: orgId,
        registrationNumber: dto.registrationNumber,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        category: dto.category,
        dailyRate: new Prisma.Decimal(dto.dailyRate),
        partnerDailyRate: new Prisma.Decimal(dto.partnerDailyRate),
        dailyMileageLimit: dto.dailyMileageLimit !== undefined ? dto.dailyMileageLimit : 100,
        monthlyRate: dto.monthlyRate !== undefined && dto.monthlyRate !== null ? new Prisma.Decimal(dto.monthlyRate) : null,
        monthlyMileageLimit: dto.monthlyMileageLimit !== undefined ? dto.monthlyMileageLimit : null,
        mileage: dto.mileage || 0,
        fuelType: dto.fuelType,
        transmission: dto.transmission,
        seats: dto.seats,
        status: dto.status,
        publicListingStatus: dto.publicListingStatus,
        publicTitle: dto.publicTitle,
        publicDescription: dto.publicDescription,
        publicPhotos: dto.publicPhotos ? JSON.stringify(dto.publicPhotos) : Prisma.JsonNull,
        marketplaceDailyRate: dto.marketplaceDailyRate ? new Prisma.Decimal(dto.marketplaceDailyRate) : null,
        minimumRentalDays: dto.minimumRentalDays || 1,
        insuranceExpiryDate: dto.insuranceExpiryDate,
        registrationExpiryDate: dto.registrationExpiryDate,
        hubLocation: dto.hubLocation,
        branchLocationId: dto.branchLocationId,
        rentalDurationType: dto.rentalDurationType || 'BOTH',
        driverAvailability: dto.driverAvailability || 'BOTH',
        notes: dto.notes,
        privatePhotos: dto.privatePhotos ? JSON.stringify(dto.privatePhotos) : Prisma.JsonNull,
      },
    });
  }

  async findAll(orgId: string, query: VehicleQueryDto) {
    const where: Prisma.VehicleWhereInput = {
      organizationId: orgId,
      status: query.status,
      category: query.category,
      publicListingStatus: query.publicListingStatus,
      make: query.make ? { contains: query.make } : undefined,
      model: query.model ? { contains: query.model } : undefined,
    };

    if (query.search) {
      where.OR = [
        { registrationNumber: { contains: query.search } },
        { make: { contains: query.search } },
        { model: { contains: query.search } },
        { publicTitle: { contains: query.search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
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

  async findOne(orgId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: {
          select: {
            bookings: true,
            partnerRentals: true,
            maintenanceRecords: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found in this organization`);
    }

    return vehicle;
  }

  async update(orgId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(orgId, id);

    const data: Prisma.VehicleUpdateInput = {
      ...dto,
      dailyRate: dto.dailyRate !== undefined ? new Prisma.Decimal(dto.dailyRate) : undefined,
      partnerDailyRate: dto.partnerDailyRate !== undefined ? new Prisma.Decimal(dto.partnerDailyRate) : undefined,
      monthlyRate: dto.monthlyRate !== undefined ? (dto.monthlyRate !== null ? new Prisma.Decimal(dto.monthlyRate) : null) : undefined,
      marketplaceDailyRate: dto.marketplaceDailyRate !== undefined ? new Prisma.Decimal(dto.marketplaceDailyRate) : undefined,
      publicPhotos: dto.publicPhotos ? JSON.stringify(dto.publicPhotos) : undefined,
      privatePhotos: dto.privatePhotos ? JSON.stringify(dto.privatePhotos) : undefined,
    };

    return this.prisma.vehicle.update({
      where: { id },
      data,
    });
  }

  async remove(orgId: string, id: string) {
    const vehicle = await this.findOne(orgId, id);

    // Check if vehicle has active direct or partner rentals
    const [activeBookings, activePartnerRentals] = await Promise.all([
      this.prisma.booking.count({
        where: {
          vehicleId: id,
          bookingStatus: { in: ['CONFIRMED', 'PICKED_UP', 'ACTIVE'] },
        },
      }),
      this.prisma.partnerRental.count({
        where: {
          vehicleId: id,
          status: { in: ['ACCEPTED', 'HANDED_OVER', 'ACTIVE'] },
        },
      }),
    ]);

    if (activeBookings > 0 || activePartnerRentals > 0) {
      throw new BadRequestException('Cannot delete vehicle with active rentals or bookings');
    }

    return this.prisma.vehicle.delete({
      where: { id },
    });
  }

  async getVehicleProfitability(orgId: string, id: string) {
    const vehicle = await this.findOne(orgId, id);

    const [transactions, directBookings, partnerRentals, maintenanceRecords] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: { vehicleId: id, organizationId: orgId },
      }),
      this.prisma.booking.findMany({
        where: { vehicleId: id, organizationId: orgId, bookingStatus: { not: 'CANCELLED' } },
        select: { totalAmount: true, paidAmount: true, numberOfDays: true },
      }),
      this.prisma.partnerRental.findMany({
        where: { vehicleId: id, supplyingOrganizationId: orgId, status: { not: 'CANCELLED' } },
        select: { totalAmount: true, paidAmount: true, numberOfDays: true },
      }),
      this.prisma.maintenanceRecord.findMany({
        where: { vehicleId: id, organizationId: orgId },
        select: { cost: true, status: true },
      }),
    ]);

    let totalDirectIncome = new Decimal(0);
    let totalPartnerIncome = new Decimal(0);
    let otherIncome = new Decimal(0);
    let maintenanceCost = new Decimal(0);
    let otherExpenses = new Decimal(0);

    for (const b of directBookings) {
      totalDirectIncome = totalDirectIncome.plus(new Decimal(b.paidAmount.toString()));
    }

    for (const pr of partnerRentals) {
      totalPartnerIncome = totalPartnerIncome.plus(new Decimal(pr.paidAmount.toString()));
    }

    for (const m of maintenanceRecords) {
      maintenanceCost = maintenanceCost.plus(new Decimal(m.cost.toString()));
    }

    for (const tx of transactions) {
      const amt = new Decimal(tx.amount.toString());
      if (tx.type === TransactionType.INCOME && tx.category === TransactionCategory.OTHER_INCOME) {
        otherIncome = otherIncome.plus(amt);
      } else if (tx.type === TransactionType.EXPENSE && tx.category !== TransactionCategory.MAINTENANCE) {
        otherExpenses = otherExpenses.plus(amt);
      }
    }

    const totalRevenue = totalDirectIncome.plus(totalPartnerIncome).plus(otherIncome);
    const totalExpenses = maintenanceCost.plus(otherExpenses);
    const netProfit = totalRevenue.minus(totalExpenses);

    const directRentalDays = directBookings.reduce((sum, b) => sum + b.numberOfDays, 0);
    const partnerRentalDays = partnerRentals.reduce((sum, pr) => sum + pr.numberOfDays, 0);

    return {
      vehicle: {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
      },
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        profitMarginPercent: totalRevenue.greaterThan(0)
          ? Number(netProfit.div(totalRevenue).mul(100).toFixed(2))
          : 0,
      },
      breakdown: {
        directRentalIncome: Number(totalDirectIncome.toFixed(2)),
        partnerRentalIncome: Number(totalPartnerIncome.toFixed(2)),
        otherIncome: Number(otherIncome.toFixed(2)),
        maintenanceCost: Number(maintenanceCost.toFixed(2)),
        otherExpenses: Number(otherExpenses.toFixed(2)),
      },
      utilization: {
        totalDirectRentalDays: directRentalDays,
        totalPartnerRentalDays: partnerRentalDays,
        totalRentalDays: directRentalDays + partnerRentalDays,
      },
    };
  }

  async getMakesAndModels() {
    return this.prisma.vehicleMake.findMany({
      include: {
        models: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategories(includeInactive = false) {
    return this.prisma.vehicleCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async createCategory(dto: CreateVehicleCategoryDto) {
    const slug = dto.slug?.trim() || dto.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const existing = await this.prisma.vehicleCategory.findFirst({
      where: {
        OR: [
          { name: { equals: dto.name } },
          { slug: { equals: slug } },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(`Vehicle category with name '${dto.name}' or slug '${slug}' already exists`);
    }

    return this.prisma.vehicleCategory.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        icon: dto.icon?.trim(),
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateVehicleCategoryDto) {
    const existing = await this.prisma.vehicleCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Vehicle category with ID ${id} not found`);
    }

    let slug = dto.slug?.trim();
    if (!slug && dto.name && dto.name !== existing.name) {
      slug = dto.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    if (dto.name || slug) {
      const conflict = await this.prisma.vehicleCategory.findFirst({
        where: {
          id: { not: id },
          OR: [
            dto.name ? { name: { equals: dto.name.trim() } } : undefined,
            slug ? { slug: { equals: slug } } : undefined,
          ].filter(Boolean) as Prisma.VehicleCategoryWhereInput[],
        },
      });

      if (conflict) {
        throw new BadRequestException(`Another vehicle category with this name or slug already exists`);
      }
    }

    return this.prisma.vehicleCategory.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        icon: dto.icon !== undefined ? dto.icon?.trim() : undefined,
        displayOrder: dto.displayOrder,
        isActive: dto.isActive,
      },
    });
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.vehicleCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Vehicle category with ID ${id} not found`);
    }

    // Check if any vehicles currently use this category name
    const vehiclesCount = await this.prisma.vehicle.count({
      where: { category: existing.name },
    });

    if (vehiclesCount > 0) {
      // Soft-delete by setting inactive
      return this.prisma.vehicleCategory.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.vehicleCategory.delete({
      where: { id },
    });
  }
}

