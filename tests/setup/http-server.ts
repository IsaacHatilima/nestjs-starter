import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

/** Bind once per file so supertest never opens and closes a recycled ephemeral port per request. */
export const TEST_PORT = 1992;

export function listenOn(app: INestApplication, port = TEST_PORT): Promise<void> {
  const server = app.getHttpServer() as Server;
  return new Promise((resolve, reject) => {
    const failed = (error: Error): void => reject(error);
    server.once('error', failed);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', failed);
      resolve();
    });
  });
}
