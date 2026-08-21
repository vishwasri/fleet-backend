import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: false, description: 'Filter by unread status only' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
