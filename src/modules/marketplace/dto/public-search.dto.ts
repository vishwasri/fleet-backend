import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { VehicleCategory } from '@prisma/client';

export class PublicVehicleSearchDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Los Angeles' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: VehicleCategory })
  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @ApiPropertyOptional({ example: '2026-09-01T10:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  pickupDateTime?: Date;

  @ApiPropertyOptional({ example: '2026-09-05T10:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  returnDateTime?: Date;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDailyRate?: number;
}
