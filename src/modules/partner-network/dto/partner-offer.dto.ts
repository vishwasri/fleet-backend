import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SubmitPartnerOfferDto {
  @ApiProperty({ description: 'Vehicle UUID from supplier fleet to offer' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ example: 80.0, description: 'Wholesale daily rate offered' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate: number;

  @ApiPropertyOptional({ example: 250.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount?: number = 0;

  @ApiPropertyOptional({ example: 'Available immediately, clean and inspected.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-09-14T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;
}
