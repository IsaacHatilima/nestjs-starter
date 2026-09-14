import { JwtService } from '@nestjs/jwt';
import { AppError } from '@/common/errors/app-error';
import { ErrorCode } from '@/common/errors/error-codes';
import { Env } from '@/config/env.schema';
import { TokenService } from '@/security/token.service';

const env = {
  JWT_SECRET: 's'.repeat(32),
  JWT_ACCESS_TTL_MINUTES: 15,
  TWO_FACTOR_CHALLENGE_TTL_SECONDS: 300,
  REFRESH_TOKEN_TTL_DAYS: 30,
} as Env;

function build(overrides: Partial<Env> = {}): TokenService {
  const merged = { ...env, ...overrides };
  return new TokenService(new JwtService({ secret: merged.JWT_SECRET }), merged);
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
  throw new Error('expected rejection');
}

describe('TokenService', () => {
  afterEach(() => jest.useRealTimers());

  it('signs an access token that verifies back to its user and session', async () => {
    const service = build();

    const token = await service.signAccessToken({
      userId: 'u1',
      sessionId: 's1',
    });

    await expect(service.verifyAccessToken(token)).resolves.toEqual({
      userId: 'u1',
      sessionId: 's1',
    });
  });

  it('refuses a two-factor challenge presented as an access token', async () => {
    const service = build();
    const challenge = await service.signTwoFactorChallenge('u1');

    expect(await codeOf(service.verifyAccessToken(challenge))).toBe(ErrorCode.INVALID_TOKEN);
  });

  it('refuses an access token presented as a two-factor challenge', async () => {
    const service = build();
    const access = await service.signAccessToken({
      userId: 'u1',
      sessionId: 's1',
    });

    expect(await codeOf(service.verifyTwoFactorChallenge(access))).toBe(ErrorCode.INVALID_TOKEN);
  });

  it('reports an expired access token as TOKEN_EXPIRED', async () => {
    jest.useFakeTimers({
      now: new Date('2026-09-12T10:00:00Z'),
      doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'],
    });
    const service = build();
    const token = await service.signAccessToken({
      userId: 'u1',
      sessionId: 's1',
    });
    jest.setSystemTime(new Date('2026-09-12T10:15:01Z'));

    expect(await codeOf(service.verifyAccessToken(token))).toBe(ErrorCode.TOKEN_EXPIRED);
  });

  it('signs a token with no expiry when the lifetime is `never`', async () => {
    const service = build({ JWT_ACCESS_TTL_MINUTES: null });

    const token = await service.signAccessToken({ userId: 'u1', sessionId: 's1' });

    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;
    expect(claims).not.toHaveProperty('exp');
    expect(claims.iat).toEqual(expect.any(Number));
  });

  it('still verifies a token with no expiry, however long has passed', async () => {
    jest.useFakeTimers({
      now: new Date('2026-09-12T10:00:00Z'),
      doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'],
    });
    const service = build({ JWT_ACCESS_TTL_MINUTES: null });
    const token = await service.signAccessToken({ userId: 'u1', sessionId: 's1' });
    jest.setSystemTime(new Date('2030-01-01T00:00:00Z'));

    await expect(service.verifyAccessToken(token)).resolves.toEqual({
      userId: 'u1',
      sessionId: 's1',
    });
  });

  it('rejects a token signed with another secret', async () => {
    const token = await build({ JWT_SECRET: 'o'.repeat(32) }).signAccessToken({
      userId: 'u1',
      sessionId: 's1',
    });

    expect(await codeOf(build().verifyAccessToken(token))).toBe(ErrorCode.INVALID_TOKEN);
  });

  it('signs a two-factor challenge that verifies back to the user', async () => {
    const service = build();

    const challenge = await service.signTwoFactorChallenge('u1');

    await expect(service.verifyTwoFactorChallenge(challenge)).resolves.toEqual({
      userId: 'u1',
    });
  });

  it('creates opaque tokens with a deterministic one-way hash', () => {
    const service = build();

    const { token, hash } = service.createOpaqueToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(service.hashOpaqueToken(token)).toBe(hash);
    expect(service.createOpaqueToken().token).not.toBe(token);
  });

  it('computes the refresh token expiry from the configured number of days', () => {
    const service = build({ REFRESH_TOKEN_TTL_DAYS: 2 });
    const now = new Date('2026-09-12T10:00:00Z');

    expect(service.refreshTokenExpiry(now).toISOString()).toBe('2026-09-14T10:00:00.000Z');
  });
});
