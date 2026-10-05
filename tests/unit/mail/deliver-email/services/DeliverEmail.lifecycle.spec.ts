import { deferred, mailDelivery } from '@tests/setup/mail-outbox.fixture';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('DeliverEmailService lifecycle', () => {
  it('does not start background polling in test mode', () => {
    const { service } = mailDelivery();

    service.onApplicationBootstrap();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops polling when the module is destroyed', async () => {
    const { service, env } = mailDelivery({ NODE_ENV: 'development' });
    const handle = jest.spyOn(service, 'handle').mockResolvedValue(undefined);
    service.onApplicationBootstrap();
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(env.MAIL_OUTBOX_POLL_MS);
    expect(handle).toHaveBeenCalledTimes(1);

    service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(env.MAIL_OUTBOX_POLL_MS * 3);

    expect(handle).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('waits for the active delivery and keeps its lease renewed during shutdown', async () => {
    const { service, repository, mailer, job, env } = mailDelivery({ NODE_ENV: 'development' });
    const sendStarted = deferred();
    const sendReleased = deferred();
    repository.claim.mockResolvedValueOnce(job);
    mailer.send.mockImplementation(() => {
      sendStarted.resolve();
      return sendReleased.promise;
    });
    service.onApplicationBootstrap();
    const running = service.handle();
    await sendStarted.promise;
    expect(jest.getTimerCount()).toBe(2);
    service.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(1);
    let shutdownComplete = false;
    const shutdown = service.beforeApplicationShutdown().then(() => {
      shutdownComplete = true;
    });
    try {
      await jest.advanceTimersByTimeAsync(env.MAIL_OUTBOX_LEASE_MS / 3);
      expect(shutdownComplete).toBe(false);
      expect(repository.complete).not.toHaveBeenCalled();
      expect(repository.renew).toHaveBeenCalledWith(job.id, job.leaseId, env.MAIL_OUTBOX_LEASE_MS);
    } finally {
      sendReleased.resolve();
      await Promise.all([running, shutdown]);
    }

    expect(shutdownComplete).toBe(true);
    expect(repository.complete).toHaveBeenCalledWith(job.id, job.leaseId);
    expect(jest.getTimerCount()).toBe(0);
  });
});
