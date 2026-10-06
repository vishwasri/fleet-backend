import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleCategoryDto {
  @ApiProperty({ example: 'Hatchback', description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'hatchback', description: 'URL-friendly slug (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Compact, efficient city vehicles with rear liftgate door.', description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'directions_car', description: 'Icon identifier or name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display order priority in UI selections' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @ApiPropertyOptional({ example: true, default: true, description: 'Whether this category is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateVehicleCategoryDto extends PartialType(CreateVehicleCategoryDto) {}
