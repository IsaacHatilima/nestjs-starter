import { Logger } from '@nestjs/common';
import { deferred, mailDelivery } from '@tests/setup/mail-outbox.fixture';

afterEach(() => jest.restoreAllMocks());

describe('DeliverEmailService', () => {
  it('decrypts a valid job, sends its message and completes the matching lease', async () => {
    const { service, repository, mailer, job, message, env } = mailDelivery();
    repository.claim.mockResolvedValueOnce(job);

    await service.handle();

    expect(repository.discardInvalid).toHaveBeenCalledTimes(1);
    expect(repository.claim).toHaveBeenCalledWith(env.MAIL_OUTBOX_LEASE_MS);
    expect(mailer.send).toHaveBeenCalledWith(message);
    expect(repository.complete).toHaveBeenCalledWith(job.id, job.leaseId);
    expect(repository.retry).not.toHaveBeenCalled();
  });

  it.each([
    [1, 5000],
    [2, 10_000],
    [3, 20_000],
    [20, 3_600_000],
    [Number.MAX_SAFE_INTEGER, 3_600_000],
  ])('schedules bounded backoff after failed attempt %i', async (attempts, delay) => {
    const { service, repository, mailer, job, message } = mailDelivery();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    repository.claim.mockResolvedValueOnce({ ...job, attempts });
    mailer.send.mockRejectedValueOnce(new Error(`SMTP failed for ${message.text}`));

    await service.handle();

    expect(repository.retry).toHaveBeenCalledWith(job.id, job.leaseId, delay);
    expect(repository.complete).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(`Email job ${job.id} failed on attempt ${attempts}; retry scheduled`);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-link-token');
  });

  it.each(['ciphertext', 'json', 'schema'])(
    'retries an invalid %s payload without logging its token',
    async (failure) => {
      const { service, repository, mailer, job, cipher, env, message } = mailDelivery();
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const encryptedPayload =
        failure === 'ciphertext'
          ? 'secret-link-token'
          : cipher.encrypt(failure === 'json' ? 'secret-link-token{' : JSON.stringify({ ...message, to: 'invalid' }));
      repository.claim.mockResolvedValueOnce({ ...job, encryptedPayload });

      await service.handle();

      expect(mailer.send).not.toHaveBeenCalled();
      expect(repository.retry).toHaveBeenCalledWith(job.id, job.leaseId, env.MAIL_OUTBOX_RETRY_MS);
      expect(repository.complete).not.toHaveBeenCalled();
      expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-link-token');
      expect(JSON.stringify(warn.mock.calls)).not.toContain(message.to);
    },
  );

  it('coalesces concurrent calls while one delivery is in flight', async () => {
    const { service, repository, mailer, job } = mailDelivery();
    const sendStarted = deferred();
    const sendReleased = deferred();
    repository.claim.mockResolvedValueOnce(job);
    mailer.send.mockImplementation(() => {
      sendStarted.resolve();
      return sendReleased.promise;
    });
    const first = service.handle();
    await sendStarted.promise;
    const second = service.handle();
    expect(second).toBe(first);
    try {
      expect(repository.discardInvalid).toHaveBeenCalledTimes(1);
      expect(mailer.send).toHaveBeenCalledTimes(1);
    } finally {
      sendReleased.resolve();
      await Promise.all([first, second]);
    }

    await service.handle();
    expect(repository.discardInvalid).toHaveBeenCalledTimes(2);
    expect(repository.complete).toHaveBeenCalledTimes(1);
  });
});
