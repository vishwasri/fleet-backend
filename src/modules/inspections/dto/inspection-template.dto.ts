import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { InspectionCategory, InspectionType } from '@prisma/client';

export class TemplateItemDto {
  @ApiProperty({ example: 'Front Bumper & Headlights' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: InspectionCategory, example: InspectionCategory.EXTERIOR })
  @IsEnum(InspectionCategory)
  category: InspectionCategory;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateInspectionTemplateDto {
  @ApiProperty({ example: 'Standard Vehicle Pickup Checklist' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: InspectionType, example: InspectionType.PICKUP })
  @IsEnum(InspectionType)
  inspectionType: InspectionType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: [TemplateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items: TemplateItemDto[];
}
