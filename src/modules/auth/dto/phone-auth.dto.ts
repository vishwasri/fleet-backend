import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class SendPhoneOtpDto {
  @ApiProperty({ example: '0778818288', description: 'User mobile phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'LOGIN', enum: ['LOGIN', 'REGISTER', 'PASSWORD_RESET'] })
  @IsString()
  @IsOptional()
  purpose?: string = 'LOGIN';
}

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '0778818288' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit SMS OTP' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiPropertyOptional({ example: 'LOGIN', enum: ['LOGIN', 'REGISTER', 'PASSWORD_RESET'] })
  @IsString()
  @IsOptional()
  purpose?: string = 'LOGIN';
}

export class ResetPasswordPhoneDto {
  @ApiProperty({ example: '0778818288' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'NewSecret2026!Pass', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
