import { generate, generateSecret } from 'otplib';
import { Env } from '@/config/env.schema';
import { TotpService } from '@/security/totp.service';

const env = { TWO_FACTOR_ISSUER: 'ZITD' } as Env;
const PERIOD = 30;
const nowSeconds = () => Math.floor(Date.now() / 1000);
const currentStep = () => Math.floor(nowSeconds() / PERIOD);

describe('TotpService', () => {
  const service = new TotpService(env);

  it('generates base32 secrets long enough for RFC 4226', () => {
    const secret = service.generateSecret();

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(26);
    expect(service.generateSecret()).not.toBe(secret);
  });

  it('accepts a code for the current time step and reports the step', async () => {
    const secret = generateSecret();
    const code = await generate({ secret });

    await expect(service.verify(secret, code, null)).resolves.toEqual({
      valid: true,
      timeStep: currentStep(),
    });
  });

  it('rejects a wrong code', async () => {
    const secret = generateSecret();

    await expect(service.verify(secret, '000000', null)).resolves.toEqual({
      valid: false,
    });
  });

  it('rejects a code whose time step was already used', async () => {
    const secret = generateSecret();
    const code = await generate({ secret });

    await expect(service.verify(secret, code, currentStep())).resolves.toEqual({
      valid: false,
    });
  });

  it('tolerates one step of clock drift in either direction', async () => {
    const secret = generateSecret();
    const previous = await generate({ secret, epoch: nowSeconds() - PERIOD });
    const next = await generate({ secret, epoch: nowSeconds() + PERIOD });

    await expect(service.verify(secret, previous, null)).resolves.toMatchObject({ valid: true });
    await expect(service.verify(secret, next, null)).resolves.toMatchObject({
      valid: true,
    });
  });

  it('rejects codes older than one step', async () => {
    const secret = generateSecret();
    const stale = await generate({ secret, epoch: nowSeconds() - 3 * PERIOD });

    await expect(service.verify(secret, stale, null)).resolves.toEqual({
      valid: false,
    });
  });

  it('ignores whitespace inside a typed code', async () => {
    const secret = generateSecret();
    const code = await generate({ secret });

    await expect(service.verify(secret, `${code.slice(0, 3)} ${code.slice(3)}`, null)).resolves.toMatchObject({
      valid: true,
    });
  });

  it('builds an otpauth URI carrying issuer, account label and secret', () => {
    const uri = service.buildOtpauthUri('ada@example.com', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');

    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('issuer=ZITD');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');
    expect(decodeURIComponent(uri)).toContain('ada@example.com');
  });

  it('renders the URI as a PNG data URL for the dashboard to show', async () => {
    const dataUrl = await service.renderQrCodeDataUrl(
      'otpauth://totp/ZITD:ada?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=ZITD',
    );

    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});
