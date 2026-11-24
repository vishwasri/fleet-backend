import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DepositType, LateReturnRateType, MarketplaceStatus, OrgRole } from '@prisma/client';

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultPickupInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultReturnInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultRentalAgreementText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireInspectionOnPickup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireInspectionOnReturn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requirePartnerInspectionOnHandover?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requirePartnerInspectionOnReturn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowBookingWithUnpaidBalance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowOverbooking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blockBookingsForExpiredInsurance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blockBookingsForExpiredRegistration?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  documentExpiryAlertDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultTaxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @ApiPropertyOptional({ enum: DepositType })
  @IsOptional()
  @IsEnum(DepositType)
  defaultDepositType?: DepositType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultDepositValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultMileageLimitPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultExtraMileageRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lateReturnGracePeriodMinutes?: number;

  @ApiPropertyOptional({ enum: LateReturnRateType })
  @IsOptional()
  @IsEnum(LateReturnRateType)
  defaultLateReturnRateType?: LateReturnRateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultLateReturnRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  futureMarketplaceInstantBookingEnabled?: boolean;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsOnlineBookings?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessRegNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ type: () => UpdateOrganizationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsDto)
  settings?: UpdateOrganizationSettingsDto;
}

export class UpdateMarketplaceStatusDto {
  @ApiPropertyOptional({ enum: MarketplaceStatus })
  @IsEnum(MarketplaceStatus)
  marketplaceStatus: MarketplaceStatus;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@apexrentals.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Sarah' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Connor' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '0771234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: OrgRole, example: 'MANAGER' })
  @IsEnum(OrgRole)
  role: OrgRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrgRole, example: 'MANAGER' })
  @IsEnum(OrgRole)
  role: OrgRole;
}
