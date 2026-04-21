import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

// VIN: 17 chars, no I/O/Q per ISO 3779
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

export class GetDocumentsDto {
  @ApiProperty({
    example: '1HGCM82633A123456',
    description: 'Vehicle Identification Number (17 chars, ISO 3779)',
  })
  @IsString()
  @Matches(VIN_REGEX, { message: 'VIN must be 17 alphanumeric characters, excluding I, O, Q' })
  vin: string;
}
