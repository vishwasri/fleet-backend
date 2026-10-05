import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PartnerHandoverDto {
  @ApiProperty({ example: 22100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  handoverMileage: number;

  @ApiProperty({ example: 'FULL' })
  @IsString()
  @IsNotEmpty()
  handoverFuelLevel: string;

  @ApiPropertyOptional({ type: [String], description: 'Handover condition inspection photos' })
  @IsOptional()
  @IsArray()
  handoverPhotos?: string[];

  @ApiPropertyOptional({ example: 'Vehicle handed over to Partner Driver. Fuel full.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PartnerReturnDto {
  @ApiProperty({ example: 22680 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  returnMileage: number;

  @ApiProperty({ example: 'FULL' })
  @IsString()
  @IsNotEmpty()
  returnFuelLevel: string;

  @ApiPropertyOptional({ type: [String], description: 'Return condition inspection photos' })
  @IsOptional()
  @IsArray()
  returnPhotos?: string[];

  @ApiPropertyOptional({ example: 'No damage, returned in excellent condition' })
  @IsOptional()
  @IsString()
  damageNotes?: string;

  @ApiPropertyOptional({ example: 'Return completed.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SettlePartnerRentalDto {
  @ApiProperty({ example: 400.0, description: 'Amount settled/paid' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'BANK_TRANSFER', default: 'BANK_TRANSFER' })
  @IsOptional()
  @IsString()
  paymentMethod?: string = 'BANK_TRANSFER';

  @ApiPropertyOptional({ example: 'B2B-WIRE-2026-9988' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Wholesale settlement completed between partners' })
  @IsOptional()
  @IsString()
  notes?: string;
}
