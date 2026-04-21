import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Use client-supplied traceId or generate a new one
    req.traceId = req.headers['x-trace-id'] ?? uuidv4();
    res.setHeader('x-trace-id', req.traceId);

    return next.handle().pipe(
      tap(() => {
        // traceId is now visible in response headers for client-side debugging
      }),
    );
  }
}
