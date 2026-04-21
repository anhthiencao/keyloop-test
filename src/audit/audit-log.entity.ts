import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('search_audit_log')
export class SearchAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'trace_id', type: 'uuid' })
  traceId: string;

  @Index()
  @Column({ type: 'char', length: 17 })
  vin: string;

  @Index()
  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number;

  @Column({ name: 'sales_status', type: 'varchar', length: 16, nullable: true })
  salesStatus: string;

  @Column({ name: 'sales_count', type: 'smallint', nullable: true })
  salesCount: number;

  @Column({ name: 'sales_error', type: 'text', nullable: true })
  salesError: string;

  @Column({ name: 'service_status', type: 'varchar', length: 16, nullable: true })
  serviceStatus: string;

  @Column({ name: 'service_count', type: 'smallint', nullable: true })
  serviceCount: number;

  @Column({ name: 'service_error', type: 'text', nullable: true })
  serviceError: string;

  @Column({ name: 'total_count', type: 'smallint', nullable: true })
  totalCount: number;

  @Column({ name: 'is_partial', type: 'boolean', default: false })
  isPartial: boolean;
}
