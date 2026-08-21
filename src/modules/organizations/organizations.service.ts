import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrganizationDto, UpdateMarketplaceStatusDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async getOrganization(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            vehicles: true,
            bookings: true,
            members: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(orgId: string, dto: UpdateOrganizationDto) {
    await this.getOrganization(orgId);

    return this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });
  }

  async updateMarketplaceStatus(orgId: string, dto: UpdateMarketplaceStatusDto) {
    await this.getOrganization(orgId);

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        marketplaceStatus: dto.marketplaceStatus,
      },
    });
  }
}
