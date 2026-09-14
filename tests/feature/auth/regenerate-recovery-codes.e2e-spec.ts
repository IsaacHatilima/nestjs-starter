import { challenge, enroll, codeAfter } from '@tests/setup/two-factor';
import { bearer, dataOf, errorCodeOf, PASSWORD, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/regenerate-recovery-codes (e2e)', () => {
  it('replaces the whole set so old codes stop working', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { secret, recoveryCodes, step } = await enroll(t, accessToken);

    const response = await t
      .http()
      .post('/auth/regenerate-recovery-codes')
      .set(bearer(accessToken))
      .send({ password: PASSWORD, code: await codeAfter(secret, step) })
      .expect(200);

    const fresh = dataOf<{ recoveryCodes: string[] }>(response).recoveryCodes;
    expect(fresh).toHaveLength(10);
    expect(fresh).not.toEqual(recoveryCodes);
    const challengeToken = await challenge(t, 'ada@example.com');
    await t.http().post('/auth/verify-two-factor').send({ challengeToken, code: recoveryCodes[0] }).expect(401);
    await t.http().post('/auth/verify-two-factor').send({ challengeToken, code: fresh[0] }).expect(200);
  });

  it('rejects a wrong password without consuming the code', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { secret, step } = await enroll(t, accessToken);
    const code = await codeAfter(secret, step);

    const wrong = await t
      .http()
      .post('/auth/regenerate-recovery-codes')
      .set(bearer(accessToken))
      .send({ password: 'wrong', code })
      .expect(401);
    expect(errorCodeOf(wrong)).toBe('INVALID_CREDENTIALS');

    await t
      .http()
      .post('/auth/regenerate-recovery-codes')
      .set(bearer(accessToken))
      .send({ password: PASSWORD, code })
      .expect(200);
  });
});
