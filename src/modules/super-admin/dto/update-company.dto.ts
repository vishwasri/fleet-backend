import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  IsDateString,
} from 'class-validator';
import { SubscriptionPlan, OrganizationStatus, MarketplaceStatus } from '@prisma/client';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Ceylon Wheels Pvt Ltd' })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({ example: 'Ceylon Wheels Premier' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'ceylon-wheels' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'contact@ceylonwheels.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+94 11 234 5678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({ enum: MarketplaceStatus })
  @IsEnum(MarketplaceStatus)
  @IsOptional()
  marketplaceStatus?: MarketplaceStatus;

  @ApiPropertyOptional({ example: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxVehicles?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxMembers?: number;

  @ApiPropertyOptional({ example: 'ANNUAL' })
  @IsString()
  @IsOptional()
  billingCycle?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  planExpiresAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessRegNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxId?: string;
}

export class UpdateCompanyStatusDto {
  @IsEnum(OrganizationStatus)
  status: OrganizationStatus;
}

export class ResetOwnerPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword: string;
}
