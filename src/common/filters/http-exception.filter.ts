import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { traceId?: string }>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const code = this.resolveErrorCode(exception);

    this.logger.error({
      traceId: req.traceId,
      method: req.method,
      path: req.url,
      status,
      code,
      message,
    });

    res.status(status).json({
      traceId: req.traceId,
      status,
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveErrorCode(exception: unknown): string {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const map: Record<number, string> = {
        400: 'BAD_REQUEST',
        404: 'NOT_FOUND',
        422: 'UNPROCESSABLE_ENTITY',
        503: 'SERVICE_UNAVAILABLE',
      };
      return map[status] ?? 'HTTP_ERROR';
    }
    return 'INTERNAL_ERROR';
  }
}
