import { generate } from 'otplib';
import { securityServices } from '@tests/setup/security.fixture';
import { credentials, USER_ID } from '@tests/setup/user.fixture';

const { cipher, totp, recovery, verifier } = securityServices();

function store() {
  return {
    recordTotpStep: jest.fn().mockResolvedValue(true),
    consume: jest.fn(),
  };
}

describe('TwoFactorVerifier', () => {
  it('accepts a valid authenticator code and records its time step', async () => {
    const secret = totp.generateSecret();
    const subject = credentials({ twoFactorSecret: cipher.encrypt(secret) });
    const target = store();

    await expect(verifier.verify(subject, await generate({ secret }), target, target)).resolves.toBe(true);
    expect(target.recordTotpStep).toHaveBeenCalledWith(USER_ID, expect.any(Number));
    expect(target.consume).not.toHaveBeenCalled();
  });

  it('rejects an authenticator code that replays the last used step', async () => {
    const secret = totp.generateSecret();
    const code = await generate({ secret });
    const step = Math.floor(Date.now() / 1000 / 30);
    const subject = credentials({
      twoFactorSecret: cipher.encrypt(secret),
      twoFactorLastUsedStep: step,
    });
    const target = store();

    await expect(verifier.verify(subject, code, target, target)).resolves.toBe(false);
    expect(target.recordTotpStep).not.toHaveBeenCalled();
  });

  it('rejects a valid code whose step a concurrent request already claimed', async () => {
    const secret = totp.generateSecret();
    const subject = credentials({ twoFactorSecret: cipher.encrypt(secret) });
    const target = store();
    target.recordTotpStep.mockResolvedValue(false);

    await expect(verifier.verify(subject, await generate({ secret }), target, target)).resolves.toBe(false);
  });

  it('falls back to consuming a recovery code', async () => {
    const subject = credentials({
      twoFactorSecret: cipher.encrypt(totp.generateSecret()),
    });
    const target = store();
    target.consume.mockResolvedValue(true);

    await expect(verifier.verify(subject, 'ABCDE-FGH23', target, target)).resolves.toBe(true);
    expect(target.consume).toHaveBeenCalledWith(USER_ID, recovery.hash('abcde-fgh23'));
  });

  it('rejects when neither the code nor a recovery code matches', async () => {
    const subject = credentials({
      twoFactorSecret: cipher.encrypt(totp.generateSecret()),
    });
    const target = store();
    target.consume.mockResolvedValue(false);

    await expect(verifier.verify(subject, '000000', target, target)).resolves.toBe(false);
  });

  it('rejects when the subject has no secret', async () => {
    const target = store();

    await expect(verifier.verify(credentials({ twoFactorSecret: null }), '123456', target, target)).resolves.toBe(
      false,
    );
    expect(target.consume).not.toHaveBeenCalled();
  });
});
