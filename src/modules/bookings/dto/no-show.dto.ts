import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MarkNoShowDto {
  @ApiPropertyOptional({ example: 75.0, description: 'No-show penalty fee charged' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  noShowFeeAmount?: number = 0;

  @ApiPropertyOptional({ example: 'Customer did not arrive within 4 hours of scheduled pickup' })
  @IsOptional()
  @IsString()
  notes?: string;
}
