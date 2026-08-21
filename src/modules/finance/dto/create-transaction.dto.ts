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
import { TransactionCategory, TransactionType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ enum: TransactionCategory, example: TransactionCategory.FUEL })
  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @ApiProperty({ example: 65.50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ example: '2026-09-01T12:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  transactionDate?: Date;

  @ApiProperty({ example: 'CREDIT_CARD' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Vehicle UUID if linked to specific vehicle' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Booking UUID if linked to specific booking' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Partner Rental UUID if linked to specific partner rental' })
  @IsOptional()
  @IsUUID()
  partnerRentalId?: string;

  @ApiPropertyOptional({ example: 'TX-FUEL-9912' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Full tank refuel after rental return' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://storage.fleet.app/receipts/fuel-1.pdf' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class FinanceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionCategory })
  @IsOptional()
  @IsEnum(TransactionCategory)
  category?: TransactionCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

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
