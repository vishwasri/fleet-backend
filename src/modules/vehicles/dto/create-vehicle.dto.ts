import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  FuelType,
  PublicListingStatus,
  TransmissionType,
  VehicleStatus,
} from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({ example: 'CA-8899-X' })
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiProperty({ example: 'Tesla' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiProperty({ example: 'Model 3 Long Range' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2024 })
  @Type(() => Number)
  @IsInt()
  @Min(1990)
  year: number;

  @ApiProperty({ example: 'Hatchback', description: 'Vehicle category (e.g. Bike, Tuk, Mini van, Hatchback, Sedan, SUV, etc.)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 120.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate: number;

  @ApiProperty({ example: 85.0, description: 'Wholesale rate for B2B partner network' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  partnerDailyRate: number;

  @ApiPropertyOptional({ example: 100, default: 100, description: 'Available included mileage per day in km' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dailyMileageLimit?: number;

  @ApiPropertyOptional({ example: 250000.0, description: 'Monthly rental rate for long-term leases' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRate?: number;

  @ApiPropertyOptional({ example: 3000, default: 3000, description: 'Available included mileage per month in km' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyMileageLimit?: number;

  @ApiPropertyOptional({ example: 15000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mileage?: number = 0;

  @ApiPropertyOptional({ enum: FuelType, default: FuelType.PETROL })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType = FuelType.PETROL;

  @ApiPropertyOptional({ enum: TransmissionType, default: TransmissionType.AUTOMATIC })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType = TransmissionType.AUTOMATIC;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  seats?: number = 5;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus = VehicleStatus.AVAILABLE;

  // Public Marketplace Fields
  @ApiPropertyOptional({ enum: PublicListingStatus, default: PublicListingStatus.DRAFT })
  @IsOptional()
  @IsEnum(PublicListingStatus)
  publicListingStatus?: PublicListingStatus = PublicListingStatus.DRAFT;

  @ApiPropertyOptional({ example: '2024 Tesla Model 3 Long Range - Luxury EV' })
  @IsOptional()
  @IsString()
  publicTitle?: string;

  @ApiPropertyOptional({ example: 'Enjoy premium electric driving with 350+ miles of range and autopilot.' })
  @IsOptional()
  @IsString()
  publicDescription?: string;

  @ApiPropertyOptional({ type: [String], description: 'Publicly visible photos for marketplace' })
  @IsOptional()
  @IsArray()
  publicPhotos?: string[];

  @ApiPropertyOptional({ example: 140.0, description: 'Public marketplace daily rate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marketplaceDailyRate?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minimumRentalDays?: number = 1;

  // Private Operational Fields
  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  insuranceExpiryDate?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationExpiryDate?: Date;

  @ApiPropertyOptional({ example: 'BOTH', description: 'Availability: SHORT_TERM, LONG_TERM, or BOTH' })
  @IsOptional()
  @IsString()
  rentalDurationType?: string = 'BOTH';

  @ApiPropertyOptional({ example: 'BOTH', description: 'Driver option: WITH_DRIVER, WITHOUT_DRIVER, or BOTH' })
  @IsOptional()
  @IsString()
  driverAvailability?: string = 'BOTH';

  @ApiPropertyOptional({ example: 'Colombo Fort Central Depot' })
  @IsOptional()
  @IsString()
  hubLocation?: string;

  @ApiPropertyOptional({ example: 'loc-fort' })
  @IsOptional()
  @IsString()
  branchLocationId?: string;

  @ApiPropertyOptional({ example: 'Private notes: purchased in March 2024, dashcam installed' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String], description: 'Private internal operational photos' })
  @IsOptional()
  @IsArray()
  privatePhotos?: string[];
}
