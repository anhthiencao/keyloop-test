import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  @Get()
  @ApiOperation({ summary: 'Health check with circuit breaker states' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      circuitBreakers: this.circuitBreaker.getAllStates(),
    };
  }
}
