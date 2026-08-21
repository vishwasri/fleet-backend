import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BookingSource, BookingStatus, PaymentStatus } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ description: 'Customer profile UUID' })
  @IsUUID()
  customerProfileId: string;

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

  @ApiProperty({ example: 'LAX Airport Terminal 4' })
  @IsString()
  @IsNotEmpty()
  pickupLocation: string;

  @ApiProperty({ example: 'LAX Airport Terminal 4' })
  @IsString()
  @IsNotEmpty()
  returnLocation: string;

  @ApiPropertyOptional({ example: 120.0, description: 'Override vehicle daily rate if needed' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customDailyRate?: number;

  @ApiPropertyOptional({ example: 20.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ example: 200.0, default: 0, description: 'Security deposit amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount?: number = 0;

  @ApiPropertyOptional({ enum: BookingSource, default: BookingSource.INTERNAL })
  @IsOptional()
  @IsEnum(BookingSource)
  bookingSource?: BookingSource = BookingSource.INTERNAL;

  @ApiPropertyOptional({ enum: BookingStatus, default: BookingStatus.CONFIRMED })
  @IsOptional()
  @IsEnum(BookingStatus)
  bookingStatus?: BookingStatus = BookingStatus.CONFIRMED;

  @ApiPropertyOptional({ example: 'Customer flight AA123, arriving 9:30 AM' })
  @IsOptional()
  @IsString()
  notes?: string;
}
