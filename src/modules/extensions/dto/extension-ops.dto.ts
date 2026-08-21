import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RequestExtensionDto {
  @ApiPropertyOptional({ description: 'Booking UUID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Partner Rental UUID' })
  @IsOptional()
  @IsUUID()
  partnerRentalId?: string;

  @ApiProperty({ example: '2026-09-08T10:00:00.000Z', description: 'Requested new return date & time' })
  @Type(() => Date)
  @IsDate()
  newReturnDateTime: Date;

  @ApiPropertyOptional({ example: 120.0, description: 'Override extension daily rate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customDailyRate?: number;

  @ApiPropertyOptional({ example: 'Customer flight delayed by 3 days' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectExtensionDto {
  @ApiProperty({ example: 'Vehicle is scheduled for maintenance on requested extension date' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
