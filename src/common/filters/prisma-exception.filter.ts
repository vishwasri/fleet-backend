import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Database request failed';

    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[]) || 'unique field';
        status = HttpStatus.CONFLICT;
        message = `Unique constraint violation on field(s): ${Array.isArray(target) ? target.join(', ') : target}`;
        break;
      }
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found or already deleted';
        break;
      }
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint violation';
        break;
      }
      default:
        this.logger.warn(`Prisma error code ${exception.code}: ${exception.message}`);
        message = `Database error: ${exception.message}`;
        break;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errorCode: exception.code,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
