import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateCustomerProfileDto) {
    return this.prisma.customerProfile.create({
      data: {
        organizationId: orgId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email.toLowerCase(),
        address: dto.address,
        drivingLicenceNumber: dto.drivingLicenceNumber,
        licenceExpiryDate: dto.licenceExpiryDate,
        documents: dto.documents ? JSON.stringify(dto.documents) : Prisma.JsonNull,
        notes: dto.notes,
      },
    });
  }

  async findAll(orgId: string, query: CustomerQueryDto) {
    const where: Prisma.CustomerProfileWhereInput = {
      organizationId: orgId,
    };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { email: { contains: query.search } },
        { phone: { contains: query.search } },
        { drivingLicenceNumber: { contains: query.search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.customerProfile.count({ where }),
      this.prisma.customerProfile.findMany({
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
    const customer = await this.prisma.customerProfile.findFirst({
      where: { id, organizationId: orgId },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                registrationNumber: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer profile with ID ${id} not found in this organization`);
    }

    return customer;
  }

  async update(orgId: string, id: string, dto: UpdateCustomerProfileDto) {
    await this.findOne(orgId, id);

    return this.prisma.customerProfile.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        documents: dto.documents ? JSON.stringify(dto.documents) : undefined,
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);

    return this.prisma.customerProfile.delete({
      where: { id },
    });
  }
}
