import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        // If response already formatted with meta
        if (res && typeof res === 'object' && 'data' in res && 'meta' in res) {
          return {
            success: true,
            statusCode,
            message: res.message || 'Operation successful',
            data: res.data,
            meta: res.meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          statusCode,
          message: res?.message || 'Operation successful',
          data: res?.data !== undefined ? res.data : res,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
