import { Controller, Get, Query, Req, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { DocumentsResponseDto } from './dto/document-response.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all documents for a VIN from both systems' })
  @ApiResponse({ status: 200, type: DocumentsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid VIN format' })
  async getDocuments(
    @Query() query: GetDocumentsDto,
    @Req() req: Request & { traceId: string },
  ): Promise<DocumentsResponseDto> {
    return this.documentsService.aggregate(query.vin, req.traceId);
  }
}
