import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get(CircuitBreakerService);
  });

  it('executes a successful function and returns its value', async () => {
    const result = await service.execute('test-ok', async () => 'hello');
    expect(result).toBe('hello');
  });

  it('propagates errors from the wrapped function', async () => {
    await expect(
      service.execute('test-err', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('returns CLOSED state for a healthy breaker', async () => {
    await service.execute('test-state', async () => 'ok');
    expect(service.getState('test-state')).toBe('CLOSED');
  });

  it('returns NOT_INITIALIZED for an unknown breaker name', () => {
    expect(service.getState('non-existent')).toBe('NOT_INITIALIZED');
  });

  it('reuses the same breaker instance across calls', async () => {
    await service.execute('reuse-test', async () => 1);
    await service.execute('reuse-test', async () => 2);

    const states = service.getAllStates();
    // Only one entry for 'reuse-test', not two
    expect(Object.keys(states).filter((k) => k === 'reuse-test')).toHaveLength(1);
  });

  it('getAllStates returns an entry for each registered breaker', async () => {
    await service.execute('breaker-a', async () => 'a');
    await service.execute('breaker-b', async () => 'b');

    const states = service.getAllStates();
    expect(states).toHaveProperty('breaker-a');
    expect(states).toHaveProperty('breaker-b');
  });
});
