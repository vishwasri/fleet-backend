import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by entity type (e.g. Booking, Vehicle, PartnerRental)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filter by entity UUID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor User UUID' })
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiPropertyOptional({ description: 'Filter by action name (e.g. CREATE, CANCEL, PICKUP, EXTEND)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
