import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { SalesAdapter } from '../adapters/sales.adapter';
import { ServiceAdapter } from '../adapters/service.adapter';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { AuditService } from '../audit/audit.service';
import { SearchAuditLog } from '../audit/audit-log.entity';
import { MockSalesController, MockServiceController } from '../mock-apis/mock-apis.controller';
import { HealthController } from '../health/health.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([SearchAuditLog]),
  ],
  controllers: [
    DocumentsController,
    MockSalesController,
    MockServiceController,
    HealthController,
  ],
  providers: [
    DocumentsService,
    SalesAdapter,
    ServiceAdapter,
    CircuitBreakerService,
    AuditService,
  ],
})
export class DocumentsModule {}
