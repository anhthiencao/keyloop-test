import { Injectable, Logger } from '@nestjs/common';
import * as CircuitBreaker from 'opossum';

export interface CircuitBreakerOptions {
  timeout?: number;       // ms before call is considered failed
  errorThresholdPercentage?: number;  // % failures before OPEN
  resetTimeout?: number;  // ms to wait before HALF-OPEN
}

const DEFAULTS: CircuitBreakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
};

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker<any[], any>>();

  /**
   * Execute fn wrapped in a named circuit breaker.
   * Creates the breaker on first call, reuses on subsequent calls.
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options: CircuitBreakerOptions = {},
  ): Promise<T> {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, this.createBreaker(name, options));
    }
    const breaker = this.breakers.get(name)!;
    return breaker.fire(fn);
  }

  getState(name: string): string {
    const breaker = this.breakers.get(name);
    if (!breaker) return 'NOT_INITIALIZED';
    if (breaker.opened) return 'OPEN';
    if (breaker.halfOpen) return 'HALF_OPEN';
    return 'CLOSED';
  }

  getAllStates(): Record<string, string> {
    const states: Record<string, string> = {};
    for (const [name] of this.breakers) {
      states[name] = this.getState(name);
    }
    return states;
  }

  private createBreaker(
    name: string,
    options: CircuitBreakerOptions,
  ): CircuitBreaker {
    const opts = { ...DEFAULTS, ...options };
    const breaker = new CircuitBreaker(async (fn: () => Promise<any>) => fn(), opts);

    breaker.on('open',     () => this.logger.warn(`[${name}] circuit OPENED`));
    breaker.on('halfOpen', () => this.logger.log(`[${name}] circuit HALF-OPEN`));
    breaker.on('close',    () => this.logger.log(`[${name}] circuit CLOSED`));
    breaker.on('timeout',  () => this.logger.warn(`[${name}] call timed out`));
    breaker.on('reject',   () => this.logger.warn(`[${name}] call rejected (circuit open)`));
    breaker.on('fallback', (result: any) =>
      this.logger.warn(`[${name}] fallback triggered`, result),
    );

    return breaker;
  }
}
