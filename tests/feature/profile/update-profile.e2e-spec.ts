import { AVATAR_URL, bearer, dataOf, errorCodeOf, errorOf, registerAndLogin, useTestApp } from '@tests/setup/test-app';
import type { Profile } from '@/profile/shared/types/Profile.types';

const ctx = useTestApp();

describe('PATCH /profile (e2e)', () => {
  it('changes one field and leaves the others alone', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t.http().patch('/profile').set(bearer(accessToken)).send({ firstName: 'Grace' }).expect(200);

    expect(dataOf<Profile>(response)).toEqual({
      firstName: 'Grace',
      lastName: 'Lovelace',
      avatarUrl: null,
    });
  });

  it('sets and then clears the avatar', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const set = await t.http().patch('/profile').set(bearer(accessToken)).send({ avatarUrl: AVATAR_URL }).expect(200);
    expect(dataOf<Profile>(set).avatarUrl).toBe(AVATAR_URL);

    const cleared = await t.http().patch('/profile').set(bearer(accessToken)).send({ avatarUrl: null }).expect(200);
    expect(dataOf<Profile>(cleared).avatarUrl).toBeNull();
  });

  it('shows the change on the next GET /auth/me', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    await t
      .http()
      .patch('/profile')
      .set(bearer(accessToken))
      .send({ firstName: 'Grace', lastName: 'Hopper', avatarUrl: AVATAR_URL })
      .expect(200);

    const me = await t.http().get('/auth/me').set(bearer(accessToken)).expect(200);
    expect(dataOf<{ profile: Profile }>(me).profile).toEqual({
      firstName: 'Grace',
      lastName: 'Hopper',
      avatarUrl: AVATAR_URL,
    });
  });

  it('only ever changes the caller, never another account', async () => {
    const { t } = ctx;
    const ada = await registerAndLogin(t, 'ada@example.com');
    const grace = await registerAndLogin(t, 'grace@example.com');

    await t.http().patch('/profile').set(bearer(ada.accessToken)).send({ lastName: 'Byron' }).expect(200);

    const other = await t.http().get('/auth/me').set(bearer(grace.accessToken)).expect(200);
    expect(dataOf<{ profile: Profile }>(other).profile.lastName).toBe('Lovelace');
  });

  it('rejects an empty body, which would change nothing', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t.http().patch('/profile').set(bearer(accessToken)).send({}).expect(400);

    expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
  });

  it('rejects a javascript: avatar URL with field-level details', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t
      .http()
      .patch('/profile')
      .set(bearer(accessToken))
      .send({ avatarUrl: 'javascript:alert(1)' })
      .expect(400);

    expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
    expect(errorOf(response).details.map((issue) => issue.path)).toEqual(['avatarUrl']);
  });

  it('rejects a blank name', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t.http().patch('/profile').set(bearer(accessToken)).send({ firstName: '   ' }).expect(400);

    expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
  });

  it('rejects requests without a token or with a bad one', async () => {
    const { t } = ctx;

    const anonymous = await t.http().patch('/profile').send({ firstName: 'Grace' }).expect(401);
    const garbage = await t.http().patch('/profile').set(bearer('garbage')).send({ firstName: 'Grace' }).expect(401);

    expect(errorCodeOf(anonymous)).toBe('INVALID_TOKEN');
    expect(errorCodeOf(garbage)).toBe('INVALID_TOKEN');
  });
});
