import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCustomerProfileDto {
  @ApiProperty({ example: 'Michael' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Johnson' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+14155552671' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'michael.j@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '742 Evergreen Terrace, Springfield, OR' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'DL-99882211-CA' })
  @IsString()
  @IsNotEmpty()
  drivingLicenceNumber: string;

  @ApiPropertyOptional({ example: '199283920192' })
  @IsOptional()
  @IsString()
  nationalIdNumber?: string;

  @ApiPropertyOptional({ example: '2028-05-15T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  licenceExpiryDate?: Date;

  @ApiPropertyOptional({ example: '+14155559988 (Brother)' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 4.9, default: 5.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ example: 'Repeated late returns and unpaid fines' })
  @IsOptional()
  @IsString()
  blacklistReason?: string;

  @ApiPropertyOptional({ description: 'Customer documents (IDs, licenses, agreements)' })
  @IsOptional()
  documents?: any;

  @ApiPropertyOptional({ example: 'VIP customer, prefers clean hybrid vehicles.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerProfileDto extends PartialType(CreateCustomerProfileDto) {}
