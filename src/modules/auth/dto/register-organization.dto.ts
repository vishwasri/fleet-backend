import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterOrganizationDto {
  // Owner info
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  // Organization info
  @ApiProperty({ example: 'Apex Car Rentals LLC' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiProperty({ example: 'Apex Rentals' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ example: 'contact@apexrentals.com' })
  @IsEmail()
  organizationEmail: string;

  @ApiProperty({ example: '+1234567899' })
  @IsString()
  @IsNotEmpty()
  organizationPhone: string;

  @ApiPropertyOptional({ example: '123 Main St, Los Angeles, CA' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'America/Los_Angeles', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}
