import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PartnerRelationshipStatus } from '@prisma/client';

export class InvitePartnerDto {
  @ApiProperty({ description: 'Target Organization UUID to connect with' })
  @IsUUID()
  targetOrganizationId: string;

  @ApiPropertyOptional({ example: 'Trusted local partner for luxury fleet expansion' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RespondPartnerInviteDto {
  @ApiProperty({ enum: [PartnerRelationshipStatus.ACTIVE, PartnerRelationshipStatus.DECLINED, PartnerRelationshipStatus.BLOCKED] })
  @IsEnum(PartnerRelationshipStatus)
  status: PartnerRelationshipStatus;
}
