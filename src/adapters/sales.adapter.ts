import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { BaseAdapter } from './base.adapter';

@Injectable()
export class SalesAdapter extends BaseAdapter {
  protected readonly logger = new Logger(SalesAdapter.name);
  protected readonly source = 'sales' as const;
  protected readonly breakerName = 'sales-api';
  protected readonly baseUrl: string;

  constructor(
    httpService: HttpService,
    circuitBreaker: CircuitBreakerService,
    config: ConfigService,
  ) {
    super(httpService, circuitBreaker);
    this.baseUrl = config.get<string>('SALES_API_URL', 'http://localhost:3001');
  }
}
