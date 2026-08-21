import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DepositType, LateReturnRateType } from '@prisma/client';

export class UpdateSettingsDto {
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requireInspectionOnPickup?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requireInspectionOnReturn?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requirePartnerInspectionOnHandover?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requirePartnerInspectionOnReturn?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowBookingWithUnpaidBalance?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowOverbooking?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  blockBookingsForExpiredInsurance?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  blockBookingsForExpiredRegistration?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  blockBookingsForExpiredRequiredDocuments?: boolean;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  documentExpiryAlertDays?: number;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultTaxRate?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @ApiPropertyOptional({ enum: DepositType, default: DepositType.FIXED })
  @IsOptional()
  @IsEnum(DepositType)
  defaultDepositType?: DepositType;

  @ApiPropertyOptional({ example: 250.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultDepositValue?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultMileageLimitPerDay?: number;

  @ApiPropertyOptional({ example: 0.35 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultExtraMileageRate?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lateReturnGracePeriodMinutes?: number;

  @ApiPropertyOptional({ enum: LateReturnRateType, default: LateReturnRateType.HOURLY })
  @IsOptional()
  @IsEnum(LateReturnRateType)
  defaultLateReturnRateType?: LateReturnRateType;

  @ApiPropertyOptional({ example: 25.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultLateReturnRate?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  futureMarketplaceInstantBookingEnabled?: boolean;
}
