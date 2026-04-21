import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentDto } from '../documents/dto/document-response.dto';

// ─── Mock Sales System API ────────────────────────────────────────────────────
@ApiTags('mock-sales-api')
@Controller({ path: 'mock/sales', host: undefined })
export class MockSalesController {
  private readonly logger = new Logger('MockSalesAPI');

  @Get('documents')
  @ApiOperation({ summary: '[MOCK] Sales System — fetch documents by VIN' })
  getDocuments(@Query('vin') vin: string): DocumentDto[] {
    this.logger.log({ vin, source: 'mock-sales' });

    return [
      {
        id: `sales-${vin}-001`,
        vin,
        title: 'Purchase Agreement',
        source: 'sales',
        createdAt: '2024-03-10T09:00:00Z',
        url: `https://storage.example.com/sales/${vin}/purchase-agreement.pdf`,
      },
      {
        id: `sales-${vin}-002`,
        vin,
        title: 'Finance Contract',
        source: 'sales',
        createdAt: '2024-03-10T09:30:00Z',
        url: `https://storage.example.com/sales/${vin}/finance-contract.pdf`,
      },
      {
        id: `sales-${vin}-003`,
        vin,
        title: 'Vehicle Inspection Report',
        source: 'sales',
        createdAt: '2024-03-08T14:00:00Z',
      },
    ];
  }
}

// ─── Mock Service System API ──────────────────────────────────────────────────
@ApiTags('mock-service-api')
@Controller({ path: 'mock/service', host: undefined })
export class MockServiceController {
  private readonly logger = new Logger('MockServiceAPI');

  @Get('documents')
  @ApiOperation({ summary: '[MOCK] Service System — fetch documents by VIN' })
  getDocuments(@Query('vin') vin: string): DocumentDto[] {
    this.logger.log({ vin, source: 'mock-service' });

    return [
      {
        id: `service-${vin}-001`,
        vin,
        title: 'Service History — 10,000 km',
        source: 'service',
        createdAt: '2024-06-15T11:00:00Z',
        url: `https://storage.example.com/service/${vin}/service-10k.pdf`,
      },
      {
        id: `service-${vin}-002`,
        vin,
        title: 'Warranty Registration',
        source: 'service',
        createdAt: '2024-03-12T08:00:00Z',
        url: `https://storage.example.com/service/${vin}/warranty.pdf`,
      },
      {
        id: `service-${vin}-003`,
        vin,
        title: 'Recall Notice — Brake System',
        source: 'service',
        createdAt: '2024-09-01T00:00:00Z',
      },
    ];
  }
}
