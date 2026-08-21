import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  meta?: MetaDto;

  @ApiProperty()
  timestamp: string;
}
