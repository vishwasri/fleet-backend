import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CheckVehicleAvailabilityDto {
  @ApiProperty({ description: 'Vehicle UUID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  pickupDateTime: Date;

  @ApiProperty({ example: '2026-09-05T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  returnDateTime: Date;

  @ApiPropertyOptional({ description: 'Exclude a specific booking UUID from collision check (for updates)' })
  @IsOptional()
  @IsString()
  excludeBookingId?: string;

  @ApiPropertyOptional({ description: 'Exclude a specific partner rental UUID from collision check' })
  @IsOptional()
  @IsString()
  excludePartnerRentalId?: string;
}

export class SearchAvailableVehiclesDto {
  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  pickupDateTime: Date;

  @ApiProperty({ example: '2026-09-05T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  returnDateTime: Date;

  @ApiPropertyOptional({ description: 'Vehicle category (e.g. Bike, Tuk, Mini van, Hatchback, etc.)', example: 'Hatchback' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Max daily rate' })
  @IsOptional()
  @Type(() => Number)
  maxDailyRate?: number;
}
