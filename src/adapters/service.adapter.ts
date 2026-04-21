import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { BaseAdapter } from './base.adapter';

@Injectable()
export class ServiceAdapter extends BaseAdapter {
  protected readonly logger = new Logger(ServiceAdapter.name);
  protected readonly source = 'service' as const;
  protected readonly breakerName = 'service-api';
  protected readonly baseUrl: string;

  constructor(
    httpService: HttpService,
    circuitBreaker: CircuitBreakerService,
    config: ConfigService,
  ) {
    super(httpService, circuitBreaker);
    this.baseUrl = config.get<string>('SERVICE_API_URL', 'http://localhost:3002');
  }
}
