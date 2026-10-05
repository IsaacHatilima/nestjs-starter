import { Controller, Get, INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DatabaseModule } from '@/database/database.module';
import { createRuntimeApp } from '@tests/setup/runtime-app';

let requestStarted: () => void = () => undefined;
let finishRequest: () => void = () => undefined;

@Controller('shutdown-probe')
class ShutdownProbeController {
  @Get()
  async handle(): Promise<{ status: 'ok' }> {
    requestStarted();
    await new Promise<void>((resolve) => (finishRequest = resolve));
    return { status: 'ok' };
  }
}

describe('Database shutdown order (e2e, no database)', () => {
  let app: INestApplication<App>;
  let closed = false;
  const end = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const database = new DatabaseModule({ end } as unknown as Pool);
    app = await createRuntimeApp({
      controllers: [ShutdownProbeController],
      providers: [{ provide: DatabaseModule, useValue: database }],
    });
  });
  afterAll(async () => {
    if (!closed) await app.close();
  });

  it('finishes an active HTTP request before closing the PostgreSQL pool', async () => {
    const started = new Promise<void>((resolve) => (requestStarted = resolve));
    const response = request(app.getHttpServer()).get('/shutdown-probe').then();
    await started;
    const shuttingDown = app.close();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(end).not.toHaveBeenCalled();
    finishRequest();
    expect((await response).status).toBe(200);
    await shuttingDown;
    closed = true;
    expect(end).toHaveBeenCalledTimes(1);
    expect((app.getHttpServer() as Server).listening).toBe(false);
  });
});
