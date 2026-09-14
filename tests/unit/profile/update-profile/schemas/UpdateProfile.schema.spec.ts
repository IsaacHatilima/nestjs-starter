import { UpdateProfileSchema } from '@/profile/update-profile/schemas/UpdateProfile.schema';

describe('UpdateProfileSchema', () => {
  it('accepts a single field, leaving the others absent', () => {
    expect(UpdateProfileSchema.parse({ firstName: 'Grace' })).toEqual({
      firstName: 'Grace',
    });
  });

  it('trims names', () => {
    expect(UpdateProfileSchema.parse({ lastName: '  Hopper  ' })).toEqual({
      lastName: 'Hopper',
    });
  });

  it('keeps an explicit null avatar, which is how a client clears it', () => {
    expect(UpdateProfileSchema.parse({ avatarUrl: null })).toEqual({
      avatarUrl: null,
    });
  });

  it('rejects an empty body, which would change nothing', () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a body of unknown keys only, because they are stripped before the check', () => {
    expect(UpdateProfileSchema.safeParse({ nickname: 'Ada' }).success).toBe(false);
  });

  it.each([{ firstName: '' }, { firstName: '   ' }, { lastName: 'x'.repeat(101) }])(
    'rejects %p as an unusable name',
    (body) => {
      expect(UpdateProfileSchema.safeParse(body).success).toBe(false);
    },
  );

  it('rejects a non-http avatar URL', () => {
    expect(UpdateProfileSchema.safeParse({ avatarUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
});
