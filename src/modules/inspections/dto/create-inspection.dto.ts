import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { InspectionItemStatus, VehicleInspectionType } from '@prisma/client';

export class InspectionItemResultDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateItemId?: string;

  @ApiProperty({ example: 'Front Bumper & Headlights' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: InspectionItemStatus, example: InspectionItemStatus.GOOD })
  @IsEnum(InspectionItemStatus)
  status: InspectionItemStatus;

  @ApiPropertyOptional({ example: 'Minor scuff on lower lip' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String], example: ['https://storage.fleet.app/insp/bump1.jpg'] })
  @IsOptional()
  @IsArray()
  photoUrls?: string[];
}

export class CreateVehicleInspectionDto {
  @ApiProperty({ description: 'Vehicle UUID' })
  @IsUUID()
  vehicleId: string;

  @ApiPropertyOptional({ description: 'Booking UUID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Partner Rental UUID' })
  @IsOptional()
  @IsUUID()
  partnerRentalId?: string;

  @ApiProperty({ enum: VehicleInspectionType, example: VehicleInspectionType.DIRECT_PICKUP })
  @IsEnum(VehicleInspectionType)
  type: VehicleInspectionType;

  @ApiProperty({ example: 45200 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiProperty({ example: 'FULL', description: 'Fuel level e.g. FULL, 7/8, 3/4, 1/2, 1/4' })
  @IsString()
  @IsNotEmpty()
  fuelLevel: string;

  @ApiPropertyOptional({ example: 'GOOD', default: 'GOOD' })
  @IsOptional()
  @IsString()
  overallCondition?: string = 'GOOD';

  @ApiPropertyOptional({ example: 'https://storage.fleet.app/signatures/cust-sig-99.png' })
  @IsOptional()
  @IsString()
  customerSignatureUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.fleet.app/signatures/staff-sig-42.png' })
  @IsOptional()
  @IsString()
  staffSignatureUrl?: string;

  @ApiPropertyOptional({ example: 'Vehicle returned clean, all accessories verified' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [InspectionItemResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemResultDto)
  items: InspectionItemResultDto[];
}
