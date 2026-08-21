import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDepositDto {
  @ApiPropertyOptional({ description: 'Booking UUID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Partner Rental UUID' })
  @IsOptional()
  @IsUUID()
  partnerRentalId?: string;

  @ApiProperty({ example: 250.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ example: 'CREDIT_CARD' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'DEP-AUTH-88991' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Security deposit held upon vehicle handover' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MarkDepositReceivedDto {
  @ApiProperty({ example: 'CREDIT_CARD' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'AUTH-PRE-9921' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeductDepositDto {
  @ApiProperty({ example: 75.0, description: 'Amount to deduct for damage, cleaning, or penalties' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Scratch on rear bumper during return inspection' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'DEP-DED-1002' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class RefundDepositDto {
  @ApiPropertyOptional({ example: 175.0, description: 'Optional partial refund amount. If omitted, refunds remaining balance.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: 'ORIGINAL_PAYMENT_METHOD' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'REF-DEP-3399' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Full deposit refund after clean vehicle return' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ForfeitDepositDto {
  @ApiProperty({ example: 'Customer failed to return vehicle and violated rental agreement' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
