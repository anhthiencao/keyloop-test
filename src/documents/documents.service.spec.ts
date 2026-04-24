import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { SalesAdapter } from '../adapters/sales.adapter';
import { ServiceAdapter } from '../adapters/service.adapter';
import { AuditService } from '../audit/audit.service';
import { DocumentDto } from './dto/document-response.dto';

const makeDocs = (source: 'sales' | 'service', count = 2): DocumentDto[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${source}-doc-${i + 1}`,
    vin: '1HGCM82633A123456',
    title: `${source} Doc ${i + 1}`,
    source,
    createdAt: new Date(2024, 0, i + 1).toISOString(),
  }));

describe('DocumentsService', () => {
  let service: DocumentsService;
  let salesAdapter: jest.Mocked<SalesAdapter>;
  let serviceAdapter: jest.Mocked<ServiceAdapter>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: SalesAdapter,
          useValue: { fetchDocuments: jest.fn() },
        },
        {
          provide: ServiceAdapter,
          useValue: { fetchDocuments: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(DocumentsService);
    salesAdapter = module.get(SalesAdapter);
    serviceAdapter = module.get(ServiceAdapter);
    auditService = module.get(AuditService);
  });

  const VIN = '1HGCM82633A123456';
  const TRACE = 'test-trace-id';

  describe('happy path — both APIs succeed', () => {
    it('merges documents from both sources', async () => {
      salesAdapter.fetchDocuments.mockResolvedValue(makeDocs('sales', 2));
      serviceAdapter.fetchDocuments.mockResolvedValue(makeDocs('service', 3));

      const result = await service.aggregate(VIN, TRACE);

      expect(result.documents).toHaveLength(5);
      expect(result.meta.isPartial).toBe(false);
      expect(result.meta.salesApi.status).toBe('success');
      expect(result.meta.serviceApi.status).toBe('success');
    });

    it('sorts documents by createdAt descending', async () => {
      const docs: DocumentDto[] = [
        { id: 'a', vin: VIN, title: 'Old', source: 'sales', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'b', vin: VIN, title: 'New', source: 'service', createdAt: '2024-06-01T00:00:00Z' },
      ];
      salesAdapter.fetchDocuments.mockResolvedValue([docs[0]]);
      serviceAdapter.fetchDocuments.mockResolvedValue([docs[1]]);

      const result = await service.aggregate(VIN, TRACE);

      expect(result.documents[0].id).toBe('b'); // newer first
    });

    it('deduplicates documents with the same id', async () => {
      const duplicate: DocumentDto = {
        id: 'shared-001', vin: VIN, title: 'Shared Doc',
        source: 'sales', createdAt: '2024-01-01T00:00:00Z',
      };
      salesAdapter.fetchDocuments.mockResolvedValue([duplicate]);
      serviceAdapter.fetchDocuments.mockResolvedValue([{ ...duplicate, source: 'service' }]);

      const result = await service.aggregate(VIN, TRACE);

      expect(result.documents).toHaveLength(1);
    });

    it('returns correct totalCount in meta', async () => {
      salesAdapter.fetchDocuments.mockResolvedValue(makeDocs('sales', 3));
      serviceAdapter.fetchDocuments.mockResolvedValue(makeDocs('service', 2));

      const result = await service.aggregate(VIN, TRACE);

      expect(result.meta.totalCount).toBe(5);
      expect(result.meta.salesApi.count).toBe(3);
      expect(result.meta.serviceApi.count).toBe(2);
    });
  });

  describe('partial failure — one API fails', () => {
    it('returns sales docs when service API fails', async () => {
      salesAdapter.fetchDocuments.mockResolvedValue(makeDocs('sales', 2));
      serviceAdapter.fetchDocuments.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.aggregate(VIN, TRACE);

      expect(result.documents).toHaveLength(2);
      expect(result.meta.isPartial).toBe(true);
      expect(result.meta.serviceApi.status).toBe('failed');
      expect(result.meta.serviceApi.reason).toBe('Connection timeout');
    });

    it('returns service docs when sales API fails', async () => {
      salesAdapter.fetchDocuments.mockRejectedValue(new Error('Circuit open'));
      serviceAdapter.fetchDocuments.mockResolvedValue(makeDocs('service', 3));

      const result = await service.aggregate(VIN, TRACE);

      expect(result.documents).toHaveLength(3);
      expect(result.meta.isPartial).toBe(true);
      expect(result.meta.salesApi.status).toBe('failed');
    });
  });

  describe('full failure — both APIs fail', () => {
    it('returns empty documents with isPartial true', async () => {
      salesAdapter.fetchDocuments.mockRejectedValue(new Error('Sales down'));
      serviceAdapter.fetchDocuments.mockRejectedValue(new Error('Service down'));

      const result = await service.aggregate(VIN, TRACE);

      expect(result.documents).toHaveLength(0);
      expect(result.meta.isPartial).toBe(true);
      expect(result.meta.totalCount).toBe(0);
    });
  });

  describe('audit logging', () => {
    it('fires audit log for successful aggregation', async () => {
      salesAdapter.fetchDocuments.mockResolvedValue(makeDocs('sales', 1));
      serviceAdapter.fetchDocuments.mockResolvedValue(makeDocs('service', 1));

      await service.aggregate(VIN, TRACE);

      // Allow microtask queue to flush (fire-and-forget)
      await Promise.resolve();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ vin: VIN, traceId: TRACE }),
      );
    });

    it('records error reason in audit log when API fails', async () => {
      salesAdapter.fetchDocuments.mockRejectedValue(new Error('timeout'));
      serviceAdapter.fetchDocuments.mockResolvedValue([]);

      await service.aggregate(VIN, TRACE);
      await Promise.resolve();

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          salesStatus: 'failed',
          salesError: 'timeout',
        }),
      );
    });
  });
});
