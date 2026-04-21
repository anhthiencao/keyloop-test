import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchAuditLog } from './audit-log.entity';

export interface AuditLogEntry {
  traceId: string;
  vin: string;
  durationMs: number;
  salesStatus: string;
  salesCount: number;
  salesError?: string;
  serviceStatus: string;
  serviceCount: number;
  serviceError?: string;
  totalCount: number;
  isPartial: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(SearchAuditLog)
    private readonly repo: Repository<SearchAuditLog>,
  ) {}

  /**
   * Fire-and-forget: never awaited by the caller.
   * Errors here must NOT bubble up to the main request flow.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.repo.save(this.repo.create(entry));
    } catch (err) {
      // Log but swallow — DB failure must not affect document response
      this.logger.error({ traceId: entry.traceId, err }, 'Audit log write failed');
    }
  }
}
