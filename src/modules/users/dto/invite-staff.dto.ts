import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class InviteStaffDto {
  @ApiProperty({ example: 'staff@apexrentals.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Alice' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+1234567800' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: OrgRole, default: OrgRole.STAFF })
  @IsEnum(OrgRole)
  role: OrgRole = OrgRole.STAFF;

  @ApiPropertyOptional({ example: 'InitialTempPassword123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  initialPassword?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role: OrgRole;
}
