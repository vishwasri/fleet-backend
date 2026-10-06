import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchLocationDto, UpdateBranchLocationDto } from './dto/branch-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLocations(organizationId: string) {
    const locations = await this.prisma.branchLocation.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (locations.length === 0) {
      // Return default organization locations if none explicitly created yet
      return [
        {
          id: 'default-fort',
          organizationId,
          name: 'Colombo Fort Central Depot',
          code: 'CMB-FORT',
          address: 'No 45, Lotus Road, Colombo Fort',
          city: 'Colombo',
          isAirportHub: false,
          isActive: true,
        },
        {
          id: 'default-bia-t1',
          organizationId,
          name: 'BIA Airport Terminal 1 (Katunayake)',
          code: 'BIA-T1',
          address: 'Arrivals Terminal 1 Outer Ring, BIA',
          city: 'Katunayake',
          isAirportHub: true,
          isActive: true,
        },
        {
          id: 'default-bia-t2',
          organizationId,
          name: 'BIA Airport Terminal 2 (Katunayake)',
          code: 'BIA-T2',
          address: 'Terminal 2 Commercial Bay, BIA',
          city: 'Katunayake',
          isAirportHub: true,
          isActive: true,
        },
        {
          id: 'default-bamba',
          organizationId,
          name: 'Colombo City West (Bambalapitiya)',
          code: 'CMB-WEST',
          address: '220 Galle Road, Bambalapitiya',
          city: 'Colombo',
          isAirportHub: false,
          isActive: true,
        },
        {
          id: 'default-kandy',
          organizationId,
          name: 'Kandy City Central Depot',
          code: 'KDY-CENTRAL',
          address: '12 Dalada Veediya, Kandy',
          city: 'Kandy',
          isAirportHub: false,
          isActive: true,
        },
      ];
    }

    return locations;
  }

  async getLocationById(organizationId: string, id: string) {
    const location = await this.prisma.branchLocation.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!location) {
      throw new NotFoundException(`Branch location #${id} not found`);
    }

    return location;
  }

  async createLocation(organizationId: string, dto: CreateBranchLocationDto) {
    return this.prisma.branchLocation.create({
      data: {
        ...dto,
        organizationId,
      },
    });
  }

  async updateLocation(organizationId: string, id: string, dto: UpdateBranchLocationDto) {
    await this.getLocationById(organizationId, id);

    return this.prisma.branchLocation.update({
      where: { id },
      data: dto,
    });
  }

  async deleteLocation(organizationId: string, id: string) {
    await this.getLocationById(organizationId, id);

    return this.prisma.branchLocation.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
