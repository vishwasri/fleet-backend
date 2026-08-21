import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { MessageChannel } from '@prisma/client';

export class CreateMessageTemplateDto {
  @ApiProperty({ example: 'Booking Confirmation Email' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: MessageChannel, example: MessageChannel.EMAIL })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiPropertyOptional({ example: 'Your Fleet Rental Booking Confirmation #{{bookingNumber}}' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    example: 'Hello {{customerName}}, your booking for {{vehicle}} from {{pickupDate}} to {{returnDate}} is confirmed!',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: ['customerName', 'vehicle', 'pickupDate', 'returnDate', 'bookingNumber'] })
  @IsOptional()
  @IsArray()
  variables?: string[];
}

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Template UUID if rendering from template' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ enum: MessageChannel, example: MessageChannel.EMAIL })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiProperty({ example: 'customer@example.com' })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiPropertyOptional({ example: 'Booking Update' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Your vehicle is ready for pickup at Terminal 4.' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: 'Variables for template interpolation' })
  @IsOptional()
  templateVariables?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Booking UUID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Customer Profile UUID' })
  @IsOptional()
  @IsUUID()
  customerProfileId?: string;

  @ApiPropertyOptional({ description: 'Partner Rental UUID' })
  @IsOptional()
  @IsUUID()
  partnerRentalId?: string;
}
