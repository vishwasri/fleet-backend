import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateVehicleDocumentDto {
  @ApiProperty({ description: 'Vehicle UUID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.INSURANCE })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({ example: 'POL-998822-CA' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  issueDate?: Date;

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @ApiPropertyOptional({ example: 'https://storage.fleet.app/docs/insurance-v1.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'Geico Commercial Fleet Policy with $1M coverage' })
  @IsOptional()
  @IsString()
  notes?: string;
}

import { PartialType } from '@nestjs/swagger';

export class UpdateVehicleDocumentDto extends PartialType(CreateVehicleDocumentDto) {}
