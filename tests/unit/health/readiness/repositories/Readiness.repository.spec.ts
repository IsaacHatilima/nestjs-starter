import type { Pool, PoolClient } from 'pg';
import { ReadinessRepository, READINESS_TIMEOUT_MS } from '@/health/readiness/repositories/Readiness.repository';

function build() {
  const client = { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), release: jest.fn() };
  const pool = { connect: jest.fn().mockResolvedValue(client) };
  return { client, pool, repository: new ReadinessRepository(pool as unknown as Pool) };
}

describe('ReadinessRepository', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shares a probe and releases a healthy connection', async () => {
    const { client, pool, repository } = build();
    const probe = repository.handle();
    expect(repository.handle()).toBe(probe);

    await expect(probe).resolves.toBe(true);
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('select 1');
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('reports an unavailable database without exposing its connection error', async () => {
    const { client, pool, repository } = build();
    pool.connect.mockRejectedValue(new Error('private database address'));

    await expect(repository.handle()).resolves.toBe(false);
    expect(client.release).not.toHaveBeenCalled();
  });

  it('bounds connection waiting and releases a checkout that finishes after the deadline', async () => {
    const { client, pool, repository } = build();
    let connected: (client: PoolClient) => void = () => undefined;
    pool.connect.mockReturnValue(new Promise((resolve) => (connected = resolve)));
    const probe = repository.handle();
    await jest.advanceTimersByTimeAsync(READINESS_TIMEOUT_MS);

    await expect(probe).resolves.toBe(false);
    expect(repository.handle()).toBe(probe);
    expect(pool.connect).toHaveBeenCalledTimes(1);
    connected(client as unknown as PoolClient);
    await jest.runAllTimersAsync();
    expect(client.query).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('discards a stalled query connection at the deadline, without releasing it twice', async () => {
    const { client, repository } = build();
    let failQuery: (error: Error) => void = () => undefined;
    client.query.mockReturnValue(new Promise((_, reject) => (failQuery = reject)));
    const probe = repository.handle();
    await jest.advanceTimersByTimeAsync(READINESS_TIMEOUT_MS);

    await expect(probe).resolves.toBe(false);
    expect(client.release).toHaveBeenCalledWith(true);
    failQuery(new Error('connection closed'));
    await jest.runAllTimersAsync();
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('discards a failed query connection before reporting unavailability', async () => {
    const { client, repository } = build();
    client.query.mockRejectedValue(new Error('query failed'));

    await expect(repository.handle()).resolves.toBe(false);
    expect(client.release).toHaveBeenCalledWith(true);
  });
});
