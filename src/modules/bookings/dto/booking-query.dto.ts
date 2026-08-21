import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { BookingStatus, PaymentStatus } from '@prisma/client';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}

export class PickupHandoverDto {
  @ApiProperty({ example: 15420 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pickupMileage: number;

  @ApiProperty({ example: 'FULL', description: 'Fuel/Charge level, e.g. FULL, 7/8, 80%' })
  @IsString()
  @IsNotEmpty()
  pickupFuelLevel: string;

  @ApiPropertyOptional({ example: 'Handover complete. Customer inspected car, no new scratch.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnInspectionDto {
  @ApiProperty({ example: 15850 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  returnMileage: number;

  @ApiProperty({ example: 'FULL' })
  @IsString()
  @IsNotEmpty()
  returnFuelLevel: string;

  @ApiPropertyOptional({ example: 'Returned clean, full tank, no damage.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddBookingPaymentDto {
  @ApiProperty({ example: 460.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'CREDIT_CARD', description: 'Payment method: CASH, CREDIT_CARD, BANK_TRANSFER, STRIPE, etc.' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'CHG-998811' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Payment received at pickup desk' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  bookingStatus?: BookingStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerProfileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
