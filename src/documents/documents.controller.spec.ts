import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TraceIdInterceptor } from '../common/interceptors/trace-id.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

const mockResponse = {
  traceId: 'test-trace',
  documents: [
    {
      id: 'sales-1HGCM82633A123456-001',
      vin: '1HGCM82633A123456',
      title: 'Purchase Agreement',
      source: 'sales',
      createdAt: '2024-03-10T09:00:00Z',
    },
  ],
  meta: {
    salesApi: { status: 'fulfilled', count: 1 },
    serviceApi: { status: 'fulfilled', count: 0 },
    isPartial: false,
    totalCount: 1,
  },
};

describe('DocumentsController (integration)', () => {
  let app: INestApplication;
  let documentsService: jest.Mocked<DocumentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: { aggregate: jest.fn().mockResolvedValue(mockResponse) },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TraceIdInterceptor());
    await app.init();

    documentsService = module.get(DocumentsService);
  });

  afterEach(() => app.close());

  describe('GET /documents', () => {
    it('returns 200 with aggregated documents for a valid VIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .query({ vin: '1HGCM82633A123456' });

      expect(res.status).toBe(200);
      expect(res.body.documents).toHaveLength(1);
      expect(res.body.meta.isPartial).toBe(false);
    });

    it('injects x-trace-id into response header', async () => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .query({ vin: '1HGCM82633A123456' });

      expect(res.headers['x-trace-id']).toBeDefined();
    });

    it('propagates x-trace-id from request header', async () => {
      const traceId = 'my-custom-trace-id';
      const res = await request(app.getHttpServer())
        .get('/documents')
        .set('x-trace-id', traceId)
        .query({ vin: '1HGCM82633A123456' });

      expect(res.headers['x-trace-id']).toBe(traceId);
    });

    it('passes vin and traceId to service', async () => {
      await request(app.getHttpServer())
        .get('/documents')
        .query({ vin: '1HGCM82633A123456' });

      expect(documentsService.aggregate).toHaveBeenCalledWith(
        '1HGCM82633A123456',
        expect.any(String),
      );
    });
  });

  describe('VIN validation', () => {
    const invalidVINs = [
      { vin: 'SHORT',             reason: 'too short' },
      { vin: '1HGCM82633A12345I', reason: 'contains I' },
      { vin: '1HGCM82633A12345O', reason: 'contains O' },
      { vin: '1HGCM82633A12345Q', reason: 'contains Q' },
      { vin: '1HGCM82633A1234!!', reason: 'special chars' },
      { vin: '',                  reason: 'empty string' },
    ];

    it.each(invalidVINs)('returns 400 for VIN "$vin" ($reason)', async ({ vin }) => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .query({ vin });

      expect(res.status).toBe(400);
    });

    it('returns 400 when vin param is missing', async () => {
      const res = await request(app.getHttpServer()).get('/documents');
      expect(res.status).toBe(400);
    });

    it('returns 200 for a valid 17-char VIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .query({ vin: 'WBA3A5C50CF256985' });

      expect(res.status).toBe(200);
    });
  });
});
