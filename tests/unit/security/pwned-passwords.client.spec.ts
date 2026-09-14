import type { Env } from '@/config/env.schema';
import { PwnedPasswordsClient } from '@/security/pwned-passwords.client';

// SHA-1 of "password", split the way the range API expects.
const PREFIX = '5BAA6';
const SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

const env = { PASSWORD_BREACH_TIMEOUT_MS: 2000 } as Env;

function respondWith(body: string, ok = true): Response {
  return { ok, status: ok ? 200 : 503, text: () => Promise.resolve(body) } as Response;
}

describe('PwnedPasswordsClient', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
  const client = new PwnedPasswordsClient(env);

  const realFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  // Leaving the mock in place would follow the process into every later suite, since --runInBand shares it.
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('reports a password that appears in the breach corpus', async () => {
    fetchMock.mockResolvedValue(respondWith(`${SUFFIX}:12345\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:2`));

    await expect(client.isBreached('password')).resolves.toBe(true);
  });

  it('sends only the first five characters of the hash, never the password or the full hash', async () => {
    fetchMock.mockResolvedValue(respondWith(''));

    await client.isBreached('password');

    const [url, init] = fetchMock.mock.calls[0];
    // Exact equality is the assertion that matters: nothing but the prefix can be in there.
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`);
    expect(url.split('/range/')[1]).toHaveLength(5);
    expect(init?.body).toBeUndefined();
  });

  it('asks for padding so the response size reveals nothing', async () => {
    fetchMock.mockResolvedValue(respondWith(''));

    await client.isBreached('password');

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Add-Padding']).toBe('true');
  });

  it('ignores padded entries, which carry a count of zero', async () => {
    fetchMock.mockResolvedValue(respondWith(`${SUFFIX}:0`));

    await expect(client.isBreached('password')).resolves.toBe(false);
  });

  it('reports a clean password when the suffix is absent', async () => {
    fetchMock.mockResolvedValue(respondWith('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:2'));

    await expect(client.isBreached('password')).resolves.toBe(false);
  });

  it('answers null, meaning unknown, when the service refuses', async () => {
    fetchMock.mockResolvedValue(respondWith('', false));

    await expect(client.isBreached('password')).resolves.toBeNull();
  });

  it('answers null when the network fails, so the caller can decide', async () => {
    fetchMock.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(client.isBreached('password')).resolves.toBeNull();
  });
});
