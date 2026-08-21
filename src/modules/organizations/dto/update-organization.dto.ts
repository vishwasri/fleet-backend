import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { MarketplaceStatus } from '@prisma/client';

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
}

export class UpdateMarketplaceStatusDto {
  @ApiPropertyOptional({ enum: MarketplaceStatus })
  @IsEnum(MarketplaceStatus)
  marketplaceStatus: MarketplaceStatus;
}
