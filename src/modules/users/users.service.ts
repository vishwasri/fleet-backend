import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteStaffDto, UpdateMemberRoleDto } from './dto/invite-staff.dto';
import { AccountType, MemberStatus, OrgRole, UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async listOrganizationMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async inviteOrAddStaff(orgId: string, dto: InviteStaffDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (user) {
      // Check if already a member
      const existingMember = await this.prisma.organizationMember.findUnique({
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
    } else {
      // Create user
      const tempPassword = dto.initialPassword || 'FleetStaffTemp123!';
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          accountType: AccountType.BUSINESS_USER,
          status: UserStatus.ACTIVE,
        },
      });
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role: dto.role,
        status: MemberStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  async updateMemberRole(orgId: string, memberId: string, dto: UpdateMemberRoleDto, currentUserId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundException('Organization member not found');
    }

    if (member.userId === currentUserId && member.role === OrgRole.OWNER && dto.role !== OrgRole.OWNER) {
      throw new ForbiddenException('Cannot demote yourself from OWNER role');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async removeMember(orgId: string, memberId: string, currentUserId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundException('Organization member not found');
    }

    if (member.userId === currentUserId) {
      throw new ForbiddenException('Cannot remove yourself from organization');
    }

    if (member.role === OrgRole.OWNER) {
      throw new ForbiddenException('Cannot remove an OWNER of the organization');
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return { message: 'Member removed successfully' };
  }
}
