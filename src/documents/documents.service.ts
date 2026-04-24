import { Injectable, Logger } from '@nestjs/common';
import { SalesAdapter } from '../adapters/sales.adapter';
import { ServiceAdapter } from '../adapters/service.adapter';
import { AuditService } from '../audit/audit.service';
import { DocumentDto, DocumentsResponseDto } from './dto/document-response.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly salesAdapter: SalesAdapter,
    private readonly serviceAdapter: ServiceAdapter,
    private readonly auditService: AuditService,
  ) {}

  async aggregate(vin: string, traceId: string): Promise<DocumentsResponseDto> {
    const start = Date.now();

    // Fire both requests in parallel — allSettled ensures one failure
    // does not cancel the other (partial result > total failure)
    const [salesResult, serviceResult] = await Promise.allSettled([
      this.salesAdapter.fetchDocuments(vin, traceId),
      this.serviceAdapter.fetchDocuments(vin, traceId),
    ]);

    const salesDocs = salesResult.status === 'fulfilled' ? salesResult.value : [];
    const serviceDocs = serviceResult.status === 'fulfilled' ? serviceResult.value : [];

    const documents = this.deduplicateAndSort([...salesDocs, ...serviceDocs]);

    const isPartial =
      salesResult.status === 'rejected' || serviceResult.status === 'rejected';

    const toSourceStatus = (s: 'fulfilled' | 'rejected') =>
      s === 'fulfilled' ? ('success' as const) : ('failed' as const);

    const meta = {
      salesApi: {
        status: toSourceStatus(salesResult.status),
        count: salesDocs.length,
        reason:
          salesResult.status === 'rejected'
            ? (salesResult.reason as Error)?.message
            : undefined,
      },
      serviceApi: {
        status: toSourceStatus(serviceResult.status),
        count: serviceDocs.length,
        reason:
          serviceResult.status === 'rejected'
            ? (serviceResult.reason as Error)?.message
            : undefined,
      },
      isPartial,
      totalCount: documents.length,
    };

    this.logger.log({
      traceId,
      vin,
      latency_ms: Date.now() - start,
      totalCount: documents.length,
      isPartial,
      salesStatus: toSourceStatus(salesResult.status),
      serviceStatus: toSourceStatus(serviceResult.status),
    });

    // Fire-and-forget — intentionally not awaited
    this.auditService.log({
      traceId,
      vin,
      durationMs: Date.now() - start,
      salesStatus: toSourceStatus(salesResult.status),
      salesCount: salesDocs.length,
      salesError:
        salesResult.status === 'rejected'
          ? (salesResult.reason as Error)?.message
          : undefined,
      serviceStatus: toSourceStatus(serviceResult.status),
      serviceCount: serviceDocs.length,
      serviceError:
        serviceResult.status === 'rejected'
          ? (serviceResult.reason as Error)?.message
          : undefined,
      totalCount: documents.length,
      isPartial,
    });

    return { traceId, documents, meta };
  }

  /**
   * Remove duplicates by id (same doc from both systems) and sort by date desc.
   */
  private deduplicateAndSort(docs: DocumentDto[]): DocumentDto[] {
    const seen = new Set<string>();
    return docs
      .filter((doc) => {
        if (seen.has(doc.id)) return false;
        seen.add(doc.id);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}
