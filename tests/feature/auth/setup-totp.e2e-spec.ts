import { enroll, setupTotp } from '@tests/setup/two-factor';
import { bearer, errorCodeOf, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/setup-totp (e2e)', () => {
  it('returns a secret, an otpauth URL and a QR code for the authenticator app', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const setup = await setupTotp(t, accessToken);

    expect(setup.secret).toMatch(/^[A-Z2-7]+$/);
    expect(setup.otpauthUrl).toContain('otpauth://totp/');
    expect(setup.otpauthUrl).toContain(`secret=${setup.secret}`);
    expect(setup.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('refuses once two-factor is already enabled', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    await enroll(t, accessToken);

    const response = await t.http().post('/auth/setup-totp').set(bearer(accessToken)).expect(409);

    expect(errorCodeOf(response)).toBe('TWO_FACTOR_ALREADY_ENABLED');
  });
});
