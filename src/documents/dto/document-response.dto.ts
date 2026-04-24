import { ApiProperty } from '@nestjs/swagger';

export type SourceSystem = 'sales' | 'service';
export type SourceStatus = 'success' | 'failed';

export class DocumentDto {
  @ApiProperty({ example: 'doc-001' })
  id: string;

  @ApiProperty({ example: '1HGCM82633A123456' })
  vin: string;

  @ApiProperty({ example: 'Purchase Agreement' })
  title: string;

  @ApiProperty({ example: 'sales', enum: ['sales', 'service'] })
  source: SourceSystem;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: 'https://storage.example.com/doc-001.pdf', required: false })
  url?: string;
}

export class SourceMetaDto {
  @ApiProperty({ enum: ['success', 'failed'] })
  status: SourceStatus;

  @ApiProperty({ example: 3 })
  count: number;

  @ApiProperty({ required: false, example: 'Connection timeout' })
  reason?: string;
}

export class DocumentsResponseDto {
  @ApiProperty()
  traceId: string;

  @ApiProperty({ type: [DocumentDto] })
  documents: DocumentDto[];

  @ApiProperty()
  meta: {
    salesApi: SourceMetaDto;
    serviceApi: SourceMetaDto;
    isPartial: boolean;
    totalCount: number;
  };
}
