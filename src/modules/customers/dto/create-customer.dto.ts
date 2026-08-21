import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ example: '2028-05-15T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  licenceExpiryDate?: Date;

  @ApiPropertyOptional({ description: 'Customer documents (IDs, licenses, agreements)' })
  @IsOptional()
  @IsArray()
  documents?: string[];

  @ApiPropertyOptional({ example: 'Preferred customer, requested child seat' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerProfileDto extends CreateCustomerProfileDto {}
