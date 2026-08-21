import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CalculateBookingPriceDto {
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

  @ApiPropertyOptional({ example: 120.0, description: 'Optional custom rate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customDailyRate?: number;

  @ApiPropertyOptional({ example: 25.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ example: 200.0, description: 'Override deposit value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customDepositAmount?: number;
}
