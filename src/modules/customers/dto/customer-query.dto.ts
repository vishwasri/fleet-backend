import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by blacklist status (true/false)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ description: 'Filter by category: all, active, blacklisted, vip' })
  @IsOptional()
  @IsString()
  filter?: string;
}
