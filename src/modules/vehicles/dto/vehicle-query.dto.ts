import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { VehicleStatus, PublicListingStatus } from '@prisma/client';

export class VehicleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ description: 'Filter by category (e.g. Bike, Tuk, Mini van, Hatchback, etc.)', example: 'Hatchback' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: PublicListingStatus })
  @IsOptional()
  @IsEnum(PublicListingStatus)
  publicListingStatus?: PublicListingStatus;

  @ApiPropertyOptional({ description: 'Filter by make' })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({ description: 'Filter by model' })
  @IsOptional()
  @IsString()
  model?: string;
}
