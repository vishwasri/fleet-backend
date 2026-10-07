import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateCustomerProfileDto) {
    let documentsJson: any = Prisma.JsonNull;
    if (dto.documents !== undefined && dto.documents !== null) {
      documentsJson = typeof dto.documents === 'string' ? JSON.parse(dto.documents) : dto.documents;
    }

    const created = await this.prisma.customerProfile.create({
      data: {
        organizationId: orgId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
        email: dto.email.toLowerCase().trim(),
        address: dto.address?.trim(),
        drivingLicenceNumber: dto.drivingLicenceNumber.trim(),
        nationalIdNumber: dto.nationalIdNumber?.trim(),
        licenceExpiryDate: dto.licenceExpiryDate,
        emergencyContact: dto.emergencyContact?.trim(),
        avatarUrl: dto.avatarUrl,
        rating: dto.rating !== undefined ? new Prisma.Decimal(dto.rating) : new Prisma.Decimal(5.0),
        isBlacklisted: dto.isBlacklisted ?? false,
        blacklistReason: dto.blacklistReason?.trim(),
        documents: documentsJson,
        notes: dto.notes?.trim(),
      },
    });

    return this.findOne(orgId, created.id);
  }

  async findAll(orgId: string, query: CustomerQueryDto) {
    const where: Prisma.CustomerProfileWhereInput = {
      organizationId: orgId,
    };

    if (query.isBlacklisted !== undefined) {
      where.isBlacklisted = query.isBlacklisted;
    } else if (query.filter === 'blacklisted') {
      where.isBlacklisted = true;
    } else if (query.filter === 'vip') {
      where.rating = { gte: 4.8 };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { firstName: { contains: s } },
        { lastName: { contains: s } },
        { email: { contains: s } },
        { phone: { contains: s } },
        { drivingLicenceNumber: { contains: s } },
        { nationalIdNumber: { contains: s } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.customerProfile.count({ where }),
      this.prisma.customerProfile.findMany({
        where,
        skip: query.skip,
        take: query.take,
        include: {
          bookings: {
            select: {
              id: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              bookingStatus: true,
              paymentStatus: true,
            },
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
      }),
    ]);

    const enrichedItems = items.map((c) => {
      let parsedDocs = [];
      if (c.documents) {
        try {
          parsedDocs = typeof c.documents === 'string' ? JSON.parse(c.documents) : c.documents;
        } catch {
          parsedDocs = [];
        }
      }

      const totalSpent = c.bookings.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);
      const outstandingBalance = c.bookings
        .filter((b) => b.bookingStatus !== 'CANCELLED')
        .reduce((sum, b) => sum + Number(b.balanceAmount || 0), 0);

      return {
        id: c.id,
        organizationId: c.organizationId,
        firstName: c.firstName,
        lastName: c.lastName,
        fullName: `${c.firstName} ${c.lastName}`.trim(),
        phone: c.phone,
        phoneNumber: c.phone,
        email: c.email,
        address: c.address || 'Colombo, Sri Lanka',
        drivingLicenceNumber: c.drivingLicenceNumber,
        drivingLicenseNumber: c.drivingLicenceNumber,
        nationalIdNumber: c.nationalIdNumber || '',
        licenceExpiryDate: c.licenceExpiryDate,
        emergencyContact: c.emergencyContact || '',
        avatarUrl: c.avatarUrl || '',
        rating: c.rating ? Number(c.rating) : 5.0,
        isBlacklisted: c.isBlacklisted,
        blacklistReason: c.blacklistReason || '',
        notes: c.notes || '',
        totalBookings: c._count.bookings,
        totalSpent,
        outstandingBalance,
        documents: parsedDocs,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return {
      data: enrichedItems,
      meta: {
        total,
        page: query.page || 1,
        limit: query.take,
        totalPages: Math.ceil(total / query.take),
      },
    };
  }

  async findOne(orgId: string, id: string) {
    const customer = await this.prisma.customerProfile.findFirst({
      where: { id, organizationId: orgId },
      include: {
        bookings: {
          orderBy: { pickupDateTime: 'desc' },
          include: {
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                registrationNumber: true,
                category: true,
                publicPhotos: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer profile with ID ${id} not found in this organization`);
    }

    let parsedDocs = [];
    if (customer.documents) {
      try {
        parsedDocs = typeof customer.documents === 'string' ? JSON.parse(customer.documents) : customer.documents;
      } catch {
        parsedDocs = [];
      }
    }

    const totalSpent = customer.bookings.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);
    const outstandingBalance = customer.bookings
      .filter((b) => b.bookingStatus !== 'CANCELLED')
      .reduce((sum, b) => sum + Number(b.balanceAmount || 0), 0);

    const bookingHistory = customer.bookings.map((b) => {
      let photos: string[] = [];
      if (b.vehicle.publicPhotos) {
        try {
          photos = typeof b.vehicle.publicPhotos === 'string'
            ? JSON.parse(b.vehicle.publicPhotos)
            : b.vehicle.publicPhotos;
        } catch {
          photos = [];
        }
      }

      return {
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        vehicleName: `${b.vehicle.make} ${b.vehicle.model}`,
        licensePlate: b.vehicle.registrationNumber,
        vehicleThumbnail: photos.length > 0 ? photos[0] : '',
        startDate: b.pickupDateTime,
        endDate: b.returnDateTime,
        pickupDateTime: b.pickupDateTime,
        returnDateTime: b.returnDateTime,
        totalAmount: Number(b.totalAmount),
        paidAmount: Number(b.paidAmount),
        balanceAmount: Number(b.balanceAmount),
        paymentStatus: b.paymentStatus,
        status: b.bookingStatus,
        bookingStatus: b.bookingStatus,
      };
    });

    return {
      id: customer.id,
      organizationId: customer.organizationId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      fullName: `${customer.firstName} ${customer.lastName}`.trim(),
      phone: customer.phone,
      phoneNumber: customer.phone,
      email: customer.email,
      address: customer.address || 'Colombo, Sri Lanka',
      drivingLicenceNumber: customer.drivingLicenceNumber,
      drivingLicenseNumber: customer.drivingLicenceNumber,
      nationalIdNumber: customer.nationalIdNumber || '',
      licenceExpiryDate: customer.licenceExpiryDate,
      emergencyContact: customer.emergencyContact || '',
      avatarUrl: customer.avatarUrl || '',
      rating: customer.rating ? Number(customer.rating) : 5.0,
      isBlacklisted: customer.isBlacklisted,
      blacklistReason: customer.blacklistReason || '',
      notes: customer.notes || '',
      totalBookings: customer._count.bookings,
      totalSpent,
      outstandingBalance,
      documents: parsedDocs,
      bookingHistory,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  async update(orgId: string, id: string, dto: UpdateCustomerProfileDto) {
    await this.findOne(orgId, id);

    let documentsJson: any = undefined;
    if (dto.documents !== undefined) {
      if (dto.documents === null) {
        documentsJson = Prisma.JsonNull;
      } else {
        documentsJson = typeof dto.documents === 'string' ? JSON.parse(dto.documents) : dto.documents;
      }
    }

    await this.prisma.customerProfile.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        rating: dto.rating !== undefined ? new Prisma.Decimal(dto.rating) : undefined,
        documents: documentsJson,
      },
    });

    return this.findOne(orgId, id);
  }

  async remove(orgId: string, id: string) {
    const customer = await this.findOne(orgId, id);

    const activeBookings = await this.prisma.booking.count({
      where: {
        customerProfileId: id,
        bookingStatus: { in: ['CONFIRMED', 'PICKED_UP'] },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException('Cannot delete customer with active or confirmed bookings');
    }

    return this.prisma.customerProfile.delete({
      where: { id },
    });
  }
}
