import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({ example: 'Customer called to cancel due to emergency' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 50.0, description: 'Optional cancellation fee retained' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cancellationFeeAmount?: number = 0;

  @ApiPropertyOptional({ example: 150.0, description: 'Optional refund amount processed' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundableAmount?: number = 0;
}
