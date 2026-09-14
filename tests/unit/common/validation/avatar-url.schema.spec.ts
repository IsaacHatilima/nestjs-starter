import { AvatarUrlSchema, MAX_AVATAR_URL_LENGTH } from '@/common/validation/avatar-url.schema';

describe('AvatarUrlSchema', () => {
  // localhost stays allowed: a development avatar is served from the app itself.
  it.each(['https://cdn.example.com/a.png', 'http://localhost:3000/a.png', 'http://127.0.0.1:9000/a.png'])(
    'accepts %s',
    (url) => {
      expect(AvatarUrlSchema.parse(url)).toBe(url);
    },
  );

  it('trims surrounding whitespace', () => {
    expect(AvatarUrlSchema.parse('  https://cdn.example.com/a.png  ')).toBe('https://cdn.example.com/a.png');
  });

  // The stored value is rendered into an <img src> or a CSS url(), so these would be stored XSS.
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'jAvAsCrIpT:alert(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'file:///etc/passwd',
    'ftp://example.com/a.png',
  ])('rejects %s', (url) => {
    expect(AvatarUrlSchema.safeParse(url).success).toBe(false);
  });

  it.each(['', 'not a url', '/relative/path.png', 'https://'])('rejects %p as not an absolute http URL', (url) => {
    expect(AvatarUrlSchema.safeParse(url).success).toBe(false);
  });

  // A refine that parsed the URL itself would throw TypeError here instead of failing validation.
  it('fails rather than throwing on a malformed URL', () => {
    expect(() => AvatarUrlSchema.safeParse('http://exa mple.com/a.png')).not.toThrow();
    expect(AvatarUrlSchema.safeParse('http://exa mple.com/a.png').success).toBe(false);
  });

  it('rejects a URL past the maximum length', () => {
    const long = `https://cdn.example.com/${'a'.repeat(MAX_AVATAR_URL_LENGTH)}.png`;
    expect(AvatarUrlSchema.safeParse(long).success).toBe(false);
  });
});
