import { challenge, enroll, codeAfter } from '@tests/setup/two-factor';
import { bearer, dataOf, errorCodeOf, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/verify-two-factor (e2e)', () => {
  it('completes login with a valid authenticator code', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { secret, step } = await enroll(t, accessToken);
    const challengeToken = await challenge(t, 'ada@example.com');

    const response = await t
      .http()
      .post('/auth/verify-two-factor')
      .send({ challengeToken, code: await codeAfter(secret, step) })
      .expect(200);

    const data = dataOf<{ status: string; accessToken: string }>(response);
    expect(data.status).toBe('authenticated');
    await t.http().get('/auth/me').set(bearer(data.accessToken)).expect(200);
  });

  it('rejects a replayed code and a wrong code', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { secret, step } = await enroll(t, accessToken);
    const code = await codeAfter(secret, step);
    await t
      .http()
      .post('/auth/verify-two-factor')
      .send({ challengeToken: await challenge(t, 'ada@example.com'), code })
      .expect(200);
    const challengeToken = await challenge(t, 'ada@example.com');

    const replay = await t.http().post('/auth/verify-two-factor').send({ challengeToken, code }).expect(401);
    const wrong = await t.http().post('/auth/verify-two-factor').send({ challengeToken, code: '000000' }).expect(401);

    expect(errorCodeOf(replay)).toBe('INVALID_TWO_FACTOR_CODE');
    expect(errorCodeOf(wrong)).toBe('INVALID_TWO_FACTOR_CODE');
  });

  it('accepts each recovery code exactly once, in any case', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { recoveryCodes } = await enroll(t, accessToken);
    const [code] = recoveryCodes;

    const first = await t
      .http()
      .post('/auth/verify-two-factor')
      .send({
        challengeToken: await challenge(t, 'ada@example.com'),
        code: code.toUpperCase(),
      })
      .expect(200);
    expect(dataOf<{ status: string }>(first).status).toBe('authenticated');

    const reused = await t
      .http()
      .post('/auth/verify-two-factor')
      .send({ challengeToken: await challenge(t, 'ada@example.com'), code })
      .expect(401);
    expect(errorCodeOf(reused)).toBe('INVALID_TWO_FACTOR_CODE');
  });

  it('refuses an access token presented as a challenge', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    await enroll(t, accessToken);

    const response = await t
      .http()
      .post('/auth/verify-two-factor')
      .send({ challengeToken: accessToken, code: '123456' })
      .expect(401);

    expect(errorCodeOf(response)).toBe('INVALID_TOKEN');
  });
});
