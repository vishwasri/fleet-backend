import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { VehicleCategory, VehicleStatus, PublicListingStatus } from '@prisma/client';

export class VehicleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ enum: VehicleCategory })
  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

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
