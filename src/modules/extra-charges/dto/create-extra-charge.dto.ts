import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExtraChargeType } from '@prisma/client';

export class CreateExtraChargeDto {
  @ApiPropertyOptional({ description: 'Booking UUID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Partner Rental UUID' })
  @IsOptional()
  @IsUUID()
  partnerRentalId?: string;

  @ApiProperty({ enum: ExtraChargeType, example: ExtraChargeType.CLEANING })
  @IsEnum(ExtraChargeType)
  type: ExtraChargeType;

  @ApiProperty({ example: 'Interior deep cleaning required due to heavy pet hair and stains' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitAmount?: number;

  @ApiProperty({ example: 150.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount?: number = 0;

  @ApiPropertyOptional({ example: 'Discovered during return inspection' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String], description: 'Damage or receipt photo URLs' })
  @IsOptional()
  @IsArray()
  attachmentUrls?: string[];
}
