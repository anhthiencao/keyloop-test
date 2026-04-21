import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { DocumentDto, SourceSystem } from '../documents/dto/document-response.dto';

export abstract class BaseAdapter {
  protected abstract readonly logger: Logger;
  protected abstract readonly source: SourceSystem;
  protected abstract readonly baseUrl: string;
  protected abstract readonly breakerName: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async fetchDocuments(vin: string, traceId: string): Promise<DocumentDto[]> {
    const start = Date.now();

    const raw = await this.circuitBreaker.execute(
      this.breakerName,
      async () => {
        const url = `${this.baseUrl}/documents?vin=${vin}`;
        const response = await firstValueFrom(
          this.httpService.get<DocumentDto[]>(url, {
            headers: { 'x-trace-id': traceId },
            timeout: 3000,
          }),
        );
        return response.data;
      },
    );

    this.logger.log({
      traceId,
      vin,
      source: this.source,
      latency_ms: Date.now() - start,
      count: raw.length,
    });

    // Tag each document with its source system
    return raw.map((doc) => ({ ...doc, source: this.source }));
  }
}
