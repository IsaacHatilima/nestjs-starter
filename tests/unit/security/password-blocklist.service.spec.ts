import type { Env } from '@/config/env.schema';
import { PasswordBlocklist } from '@/security/password-blocklist.service';
import type { PwnedPasswordsClient } from '@/security/pwned-passwords.client';

const CLEAN = 'ferrous gadwall oxbow limpet';

function build(breached: boolean | null, breachCheck = true) {
  const client = { isBreached: jest.fn().mockResolvedValue(breached) };
  const env = { PASSWORD_BREACH_CHECK: breachCheck, APP_NAME: 'ZITD' } as Env;
  return { client, blocklist: new PasswordBlocklist(client as unknown as PwnedPasswordsClient, env) };
}

describe('PasswordBlocklist', () => {
  it('allows a password that is neither common nor breached', async () => {
    const { blocklist } = build(false);

    await expect(blocklist.check(CLEAN)).resolves.toEqual({ blocked: false });
  });

  it('rejects a commonly used password without asking the network', async () => {
    const { client, blocklist } = build(false);

    await expect(blocklist.check('password')).resolves.toEqual({ blocked: true, reason: 'common' });
    expect(client.isBreached).not.toHaveBeenCalled();
  });

  it('sees through trailing digits and symbols bolted onto a common password', async () => {
    const { blocklist } = build(false);

    await expect(blocklist.check('Password12345678')).resolves.toEqual({ blocked: true, reason: 'common' });
    await expect(blocklist.check('sunshine!!!!!!!!')).resolves.toEqual({ blocked: true, reason: 'common' });
  });

  it('rejects a password built out of the service name or the address signing up', async () => {
    const { blocklist } = build(false);

    await expect(blocklist.check('ZITD!!!!!!!!!!!!')).resolves.toEqual({ blocked: true, reason: 'context' });
    await expect(blocklist.check('ZITDZITDZITDZITD')).resolves.toEqual({ blocked: true, reason: 'context' });
    await expect(blocklist.check('Ada.Lovelace99', ['ada.lovelace@example.com'])).resolves.toEqual({
      blocked: true,
      reason: 'context',
    });
  });

  it('allows a real passphrase that merely contains a context term', async () => {
    const { blocklist } = build(false);

    await expect(blocklist.check('zitdish gadwall oxbow limpet')).resolves.toEqual({ blocked: false });
  });

  it('ignores context terms too short to mean anything', async () => {
    const { blocklist } = build(false);

    await expect(blocklist.check(CLEAN, ['ab@example.com'])).resolves.toEqual({ blocked: false });
  });

  it('rejects a password found in the breach corpus', async () => {
    const { blocklist } = build(true);

    await expect(blocklist.check(CLEAN)).resolves.toEqual({ blocked: true, reason: 'breached' });
  });

  it('lets the password through when the breach service is unreachable', async () => {
    const { blocklist } = build(null);

    await expect(blocklist.check(CLEAN)).resolves.toEqual({ blocked: false });
  });

  it('skips the breach lookup entirely when it is switched off', async () => {
    const { client, blocklist } = build(true, false);

    await expect(blocklist.check(CLEAN)).resolves.toEqual({ blocked: false });
    expect(client.isBreached).not.toHaveBeenCalled();
  });
});
