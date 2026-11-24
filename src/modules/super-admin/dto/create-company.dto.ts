import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { SubscriptionPlan, OrganizationStatus } from '@prisma/client';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Ceylon Wheels Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiProperty({ example: 'Ceylon Wheels' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({ example: 'ceylon-wheels' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'info@ceylonwheels.com' })
  @IsEmail()
  organizationEmail: string;

  @ApiProperty({ example: '+94 11 234 5678' })
  @IsString()
  @IsNotEmpty()
  organizationPhone: string;

  @ApiPropertyOptional({ example: '45 Galle Road, Colombo 03, Sri Lanka' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Asia/Colombo', default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'LKR', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: SubscriptionPlan, default: SubscriptionPlan.STARTER })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({ example: 25, default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxVehicles?: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxMembers?: number;

  @ApiPropertyOptional({ example: 'PV123456' })
  @IsString()
  @IsOptional()
  businessRegNumber?: string;

  @ApiPropertyOptional({ example: 'TAX-987654321' })
  @IsString()
  @IsOptional()
  taxId?: string;

  // Primary Company Owner Admin Details
  @ApiProperty({ example: 'Kamal' })
  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @ApiProperty({ example: 'Perera' })
  @IsString()
  @IsNotEmpty()
  ownerLastName: string;

  @ApiProperty({ example: 'kamal@ceylonwheels.com' })
  @IsEmail()
  ownerEmail: string;

  @ApiPropertyOptional({ example: '+94 77 123 4567' })
  @IsString()
  @IsOptional()
  ownerPhone?: string;

  @ApiProperty({ example: 'Admin123!Secure', minLength: 8 })
  @IsString()
  @MinLength(8)
  ownerPassword: string;
}
