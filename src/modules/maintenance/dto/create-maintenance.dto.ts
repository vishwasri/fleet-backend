import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MaintenanceStatus, VehicleBlockReason } from '@prisma/client';

export class CreateMaintenanceDto {
  @ApiProperty({ description: 'Vehicle UUID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ example: 'Brake pad replacement & 30,000-mile service' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Front and rear brake pads replacement with OEM parts' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-09-10T09:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  scheduledDate: Date;

  @ApiPropertyOptional({ example: '2026-09-10T17:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedDate?: Date;

  @ApiPropertyOptional({ example: 350.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number = 0;

  @ApiPropertyOptional({ enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus = MaintenanceStatus.SCHEDULED;

  @ApiPropertyOptional({ example: 'Service done at Downtown Garage' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String], description: 'Invoice or receipt attachments' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class CreateVehicleBlockDto {
  @ApiProperty({ description: 'Vehicle UUID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ enum: VehicleBlockReason, default: VehicleBlockReason.MAINTENANCE })
  @IsEnum(VehicleBlockReason)
  reason: VehicleBlockReason;

  @ApiProperty({ example: '2026-09-10T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startDateTime: Date;

  @ApiProperty({ example: '2026-09-12T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate()
  endDateTime: Date;

  @ApiPropertyOptional({ example: 'Reserved for owner personal trip' })
  @IsOptional()
  @IsString()
  notes?: string;
}
