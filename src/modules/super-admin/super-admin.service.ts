import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto, UpdateCompanyStatusDto } from './dto/update-company.dto';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import {
  AccountType,
  OrgRole,
  UserStatus,
  MarketplaceStatus,
  OrganizationStatus,
  SubscriptionPlan,
  Prisma,
} from '@prisma/client';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get macro platform KPI metrics for Super Admin SaaS Dashboard
   */
  async getPlatformMetrics() {
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalVehicles,
      vehiclesAvailable,
      vehiclesRented,
      vehiclesMaintenance,
      totalBookings,
      totalUsers,
      planBreakdown,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { status: OrganizationStatus.ACTIVE } }),
      this.prisma.organization.count({ where: { status: OrganizationStatus.SUSPENDED } }),
      this.prisma.vehicle.count(),
      this.prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.vehicle.count({ where: { status: { in: ['DIRECT_RENTAL', 'PARTNER_RENTAL'] } } }),
      this.prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.booking.count(),
      this.prisma.user.count({ where: { accountType: AccountType.BUSINESS_USER } }),
      this.prisma.organization.groupBy({
        by: ['subscriptionPlan'],
        _count: { id: true },
      }),
    ]);

    // Approximate Monthly Recurring Revenue (MRR) based on tiers
    // FREE_TRIAL: $0, STARTER: $49/mo, PRO: $149/mo, ENTERPRISE: $399/mo
    const tierPricing: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.FREE_TRIAL]: 0,
      [SubscriptionPlan.STARTER]: 49,
      [SubscriptionPlan.PRO]: 149,
      [SubscriptionPlan.ENTERPRISE]: 399,
    };

    let estimatedMRR = 0;
    const plansDistribution: Record<string, number> = {};
    for (const item of planBreakdown) {
      const plan = item.subscriptionPlan;
      const count = item._count.id;
      plansDistribution[plan] = count;
      estimatedMRR += (tierPricing[plan] || 0) * count;
    }

    return {
      overview: {
        totalCompanies: totalOrganizations,
        activeCompanies: activeOrganizations,
        suspendedCompanies: suspendedOrganizations,
        totalFleetVehicles: totalVehicles,
        fleetAvailable: vehiclesAvailable,
        fleetRented: vehiclesRented,
        fleetMaintenance: vehiclesMaintenance,
        totalBookings,
        totalRegisteredUsers: totalUsers,
        estimatedMRR,
      },
      plansDistribution,
    };
  }

  /**
   * Paginated list of all companies with owner user and aggregate usage statistics
   */
  async getCompanies(query: QueryCompaniesDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.plan) {
      where.subscriptionPlan = query.plan;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { displayName: { contains: term } },
        { legalName: { contains: term } },
        { email: { contains: term } },
        { phone: { contains: term } },
        { slug: { contains: term } },
      ];
    }

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              vehicles: true,
              members: true,
              bookings: true,
            },
          },
          members: {
            where: { role: OrgRole.OWNER },
            take: 1,
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items = organizations.map((org) => {
      const owner = org.members[0]?.user || null;
      return {
        id: org.id,
        slug: org.slug,
        legalName: org.legalName,
        displayName: org.displayName,
        email: org.email,
        phone: org.phone,
        address: org.address,
        currency: org.currency,
        timezone: org.timezone,
        status: org.status,
        subscriptionPlan: org.subscriptionPlan,
        maxVehicles: org.maxVehicles,
        maxMembers: org.maxMembers,
        billingCycle: org.billingCycle,
        planExpiresAt: org.planExpiresAt,
        businessRegNumber: org.businessRegNumber,
        taxId: org.taxId,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        usage: {
          vehicleCount: org._count.vehicles,
          vehicleCapacityPercent: Math.min(
            100,
            Math.round((org._count.vehicles / (org.maxVehicles || 1)) * 100),
          ),
          memberCount: org._count.members,
          bookingCount: org._count.bookings,
        },
        owner,
      };
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single company 360-degree details
   */
  async getCompanyById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        settings: true,
        _count: {
          select: {
            vehicles: true,
            members: true,
            bookings: true,
            customerProfiles: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        vehicles: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            registrationNumber: true,
            status: true,
            category: true,
            dailyRate: true,
          },
        },
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            bookingNumber: true,
            bookingStatus: true,
            totalAmount: true,
            pickupDateTime: true,
            returnDateTime: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return org;
  }

  /**
   * Register a new company / tenant into the SaaS platform
   */
  async registerCompany(dto: CreateCompanyDto) {
    // 1. Verify owner email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException(
        `A user with email "${dto.ownerEmail}" already exists. Please use a unique owner email.`,
      );
    }

    // 2. Verify slug uniqueness if provided
    let slug = dto.slug ? dto.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-') : null;
    if (slug) {
      const existingSlug = await this.prisma.organization.findUnique({
        where: { slug },
      });
      if (existingSlug) {
        throw new ConflictException(`Company slug/subdomain "${slug}" is already in use.`);
      }
    } else {
      // Auto-generate slug from displayName
      const candidateSlug = dto.displayName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      const count = await this.prisma.organization.count({
        where: { slug: { startsWith: candidateSlug } },
      });
      slug = count > 0 ? `${candidateSlug}-${count + 1}` : candidateSlug;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.ownerPassword, saltRounds);

    return this.prisma.$transaction(async (tx) => {
      // Create Company Owner User
      const user = await tx.user.create({
        data: {
          email: dto.ownerEmail.toLowerCase().trim(),
          passwordHash,
          firstName: dto.ownerFirstName.trim(),
          lastName: dto.ownerLastName.trim(),
          phone: dto.ownerPhone?.trim(),
          accountType: AccountType.BUSINESS_USER,
          status: UserStatus.ACTIVE,
        },
      });

      // Create Organization
      const organization = await tx.organization.create({
        data: {
          slug,
          legalName: dto.legalName.trim(),
          displayName: dto.displayName.trim(),
          email: dto.organizationEmail.toLowerCase().trim(),
          phone: dto.organizationPhone.trim(),
          address: dto.address?.trim(),
          timezone: dto.timezone || 'UTC',
          currency: dto.currency || 'USD',
          status: OrganizationStatus.ACTIVE,
          subscriptionPlan: dto.subscriptionPlan || SubscriptionPlan.STARTER,
          maxVehicles: dto.maxVehicles || 20,
          maxMembers: dto.maxMembers || 5,
          businessRegNumber: dto.businessRegNumber?.trim(),
          taxId: dto.taxId?.trim(),
          marketplaceStatus: MarketplaceStatus.PRIVATE,
          acceptsOnlineBookings: false,
        },
      });

      // Create Default Organization Settings
      await tx.organizationSettings.create({
        data: {
          organizationId: organization.id,
          currency: organization.currency,
          timezone: organization.timezone,
          defaultDepositValue: new Prisma.Decimal(200.0),
          requireInspectionOnPickup: false,
          requireInspectionOnReturn: true,
        },
      });

      // Link User as Owner Member
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: OrgRole.OWNER,
        },
      });

      return {
        company: {
          id: organization.id,
          slug: organization.slug,
          displayName: organization.displayName,
          legalName: organization.legalName,
          email: organization.email,
          phone: organization.phone,
          status: organization.status,
          subscriptionPlan: organization.subscriptionPlan,
          maxVehicles: organization.maxVehicles,
          maxMembers: organization.maxMembers,
          currency: organization.currency,
          timezone: organization.timezone,
          createdAt: organization.createdAt,
        },
        owner: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
        },
      };
    });
  }

  /**
   * Update company details, quotas, and subscription tier
   */
  async updateCompany(id: string, dto: UpdateCompanyDto) {
    await this.getCompanyById(id);

    if (dto.slug) {
      const existing = await this.prisma.organization.findFirst({
        where: {
          slug: dto.slug.toLowerCase().trim(),
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" is already taken by another company.`);
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        legalName: dto.legalName,
        displayName: dto.displayName,
        slug: dto.slug?.toLowerCase().trim(),
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone,
        address: dto.address,
        timezone: dto.timezone,
        currency: dto.currency,
        logoUrl: dto.logoUrl,
        description: dto.description,
        status: dto.status,
        subscriptionPlan: dto.subscriptionPlan,
        marketplaceStatus: dto.marketplaceStatus,
        maxVehicles: dto.maxVehicles,
        maxMembers: dto.maxMembers,
        billingCycle: dto.billingCycle,
        planExpiresAt: dto.planExpiresAt ? new Date(dto.planExpiresAt) : undefined,
        businessRegNumber: dto.businessRegNumber,
        taxId: dto.taxId,
      },
    });
  }

  /**
   * Fast toggle company status (e.g. SUSPENDED vs ACTIVE)
   */
  async setCompanyStatus(id: string, dto: UpdateCompanyStatusDto) {
    await this.getCompanyById(id);

    return this.prisma.organization.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /**
   * Reset the password for a company's owner
   */
  async resetOwnerPassword(companyId: string, newPassword: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: companyId },
      include: {
        members: {
          where: { role: OrgRole.OWNER },
          include: { user: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const ownerMember = org.members[0];

    if (!ownerMember || !ownerMember.user) {
      throw new NotFoundException('Company has no designated owner account.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: ownerMember.userId },
      data: { passwordHash },
    });

    return {
      message: `Password successfully updated for owner ${ownerMember.user.email}`,
      ownerEmail: ownerMember.user.email,
    };
  }
}
