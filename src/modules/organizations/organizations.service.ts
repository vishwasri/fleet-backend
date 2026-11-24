import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateOrganizationDto,
  UpdateMarketplaceStatusDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/update-organization.dto';
import { OrgRole, AccountType, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async getOrganization(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        settings: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                accountType: true,
                status: true,
              },
            },
          },
        },
        branchLocations: true,
        _count: {
          select: {
            vehicles: true,
            bookings: true,
            members: true,
            customerProfiles: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Auto-initialize settings if not present
    if (!org.settings) {
      const createdSettings = await this.prisma.organizationSettings.create({
        data: {
          organizationId: org.id,
          currency: org.currency || 'LKR',
          timezone: org.timezone || 'UTC',
          defaultMileageLimitPerDay: 250,
          defaultExtraMileageRate: 100.0,
          lateReturnGracePeriodMinutes: 60,
          defaultDepositValue: 25000.0,
        },
      });
      return { ...org, settings: createdSettings };
    }

    return org;
  }

  async updateOrganization(orgId: string, dto: UpdateOrganizationDto) {
    await this.getOrganization(orgId);

    const { settings, ...orgData } = dto;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(orgData).length > 0) {
        await tx.organization.update({
          where: { id: orgId },
          data: orgData,
        });
      }

      if (settings && Object.keys(settings).length > 0) {
        await tx.organizationSettings.upsert({
          where: { organizationId: orgId },
          create: {
            organizationId: orgId,
            ...settings,
          },
          update: settings,
        });
      }
    });

    return this.getOrganization(orgId);
  }

  async updateMarketplaceStatus(orgId: string, dto: UpdateMarketplaceStatusDto) {
    await this.getOrganization(orgId);

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        marketplaceStatus: dto.marketplaceStatus,
      },
      include: {
        settings: true,
      },
    });
  }

  async getMembers(orgId: string) {
    await this.getOrganization(orgId);

    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            accountType: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(orgId: string, dto: InviteMemberDto) {
    const org = await this.getOrganization(orgId);

    // Check quota
    const membersCount = org._count?.members || org.members.length;
    if (membersCount >= org.maxMembers) {
      throw new BadRequestException(
        `Staff seat limit reached for your ${org.subscriptionPlan} plan (${org.maxMembers} seats max). Please upgrade in billing.`,
      );
    }

    const email = dto.email.toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email },
      });

      if (!user) {
        const tempPass = await bcrypt.hash(`Fleet${Date.now()}!`, 10);
        user = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            passwordHash: tempPass,
            accountType: AccountType.BUSINESS_USER,
            status: UserStatus.ACTIVE,
          },
        });
      }

      const existingMember = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this organization');
      }

      return tx.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          role: dto.role,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              accountType: true,
            },
          },
        },
      });
    });
  }

  async updateMemberRole(orgId: string, memberId: string, dto: UpdateMemberRoleDto) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async removeMember(orgId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Ensure we don't delete the last owner
    if (member.role === OrgRole.OWNER) {
      const ownersCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: OrgRole.OWNER },
      });
      if (ownersCount <= 1) {
        throw new BadRequestException('Cannot remove the primary or sole owner of the organization');
      }
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return { success: true, message: 'Member removed successfully' };
  }
}
