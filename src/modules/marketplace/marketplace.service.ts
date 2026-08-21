import { Injectable, NotFoundException } from '@nestjs/common';
import { MarketplaceStatus, PublicListingStatus, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { PublicVehicleSearchDto } from './dto/public-search.dto';

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
  ) {}

  async searchPublicVehicles(query: PublicVehicleSearchDto) {
    const where: any = {
      publicListingStatus: PublicListingStatus.PUBLISHED,
      status: { not: VehicleStatus.INACTIVE },
      organization: {
        marketplaceStatus: MarketplaceStatus.PUBLISHED,
      },
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.maxDailyRate) {
      where.OR = [
        { marketplaceDailyRate: { lte: query.maxDailyRate } },
        { dailyRate: { lte: query.maxDailyRate } },
      ];
    }

    const candidateVehicles = await this.prisma.vehicle.findMany({
      where,
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        category: true,
        seats: true,
        transmission: true,
        fuelType: true,
        dailyRate: true,
        marketplaceDailyRate: true,
        minimumRentalDays: true,
        publicTitle: true,
        publicDescription: true,
        publicPhotos: true,
        organization: {
          select: {
            id: true,
            displayName: true,
            logoUrl: true,
            timezone: true,
            currency: true,
          },
        },
      },
      skip: query.skip,
      take: query.take,
    });

    let availableResults = candidateVehicles;

    // Filter by date availability if pickup & return dates are supplied
    if (query.pickupDateTime && query.returnDateTime) {
      this.availabilityService.validateDateRange(query.pickupDateTime, query.returnDateTime);
      const filtered = [];
      for (const v of candidateVehicles) {
        const conflicts = await this.availabilityService.findConflicts(
          this.prisma,
          v.id,
          new Date(query.pickupDateTime),
          new Date(query.returnDateTime),
        );
        if (conflicts.length === 0) {
          filtered.push(v);
        }
      }
      availableResults = filtered;
    }

    return {
      data: availableResults,
      meta: {
        page: query.page || 1,
        limit: query.take,
        total: availableResults.length,
      },
    };
  }

  async getPublicVehicleDetails(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        publicListingStatus: PublicListingStatus.PUBLISHED,
        organization: {
          marketplaceStatus: MarketplaceStatus.PUBLISHED,
        },
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        category: true,
        seats: true,
        transmission: true,
        fuelType: true,
        dailyRate: true,
        marketplaceDailyRate: true,
        minimumRentalDays: true,
        publicTitle: true,
        publicDescription: true,
        publicPhotos: true,
        organization: {
          select: {
            id: true,
            displayName: true,
            description: true,
            logoUrl: true,
            currency: true,
            timezone: true,
            acceptsOnlineBookings: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Public vehicle listing not found or not published');
    }

    return vehicle;
  }

  async getPublicOrganizationProfile(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        id: orgId,
        marketplaceStatus: MarketplaceStatus.PUBLISHED,
      },
      select: {
        id: true,
        displayName: true,
        description: true,
        logoUrl: true,
        acceptsOnlineBookings: true,
        currency: true,
        timezone: true,
        vehicles: {
          where: {
            publicListingStatus: PublicListingStatus.PUBLISHED,
            status: { not: VehicleStatus.INACTIVE },
          },
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            category: true,
            publicTitle: true,
            publicPhotos: true,
            marketplaceDailyRate: true,
            dailyRate: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Public organization not found or is currently private');
    }

    return org;
  }
}
