import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePartnerRequestDto {
  @ApiProperty({ example: 'SUV', description: 'Vehicle category (e.g. Bike, Tuk, Mini van, Hatchback, Sedan, SUV, etc.)' })
  @IsString()
  @IsNotEmpty()
  vehicleCategory: string;

  @ApiProperty({ example: 75.0, description: 'Target wholesale daily budget rate' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetWholesaleRate: number;

  @ApiProperty({ example: '2026-09-15T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  pickupDateTime: Date;

  @ApiProperty({ example: '2026-09-20T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  returnDateTime: Date;

  @ApiProperty({ example: 'Downtown LA Hub' })
  @IsString()
  @IsNotEmpty()
  pickupLocation: string;

  @ApiProperty({ example: 'Downtown LA Hub' })
  @IsString()
  @IsNotEmpty()
  returnLocation: string;

  @ApiPropertyOptional({ example: 'Looking for 7-seater SUV (Tahoe/Yukon or similar)' })
  @IsOptional()
  @IsString()
  notes?: string;
}
