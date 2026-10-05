import { bodyOf, errorOf, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('response envelope (e2e)', () => {
  it.each([
    ['/auth/logout', { refreshToken: 'unknown' }],
    ['/auth/forgot-password', { email: 'nobody@example.com' }],
    ['/auth/resend-verification', { email: 'nobody@example.com' }],
  ])('preserves all three envelope keys for a void result at %s', async (path, payload) => {
    const response = await ctx.t.http().post(path).send(payload).expect(200);

    expect(response.body).toEqual({ success: true, data: null, error: null });
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  /**
   * The body never reaches a schema, so there are no field issues to report.
   * Calling it VALIDATION_ERROR would promise clients a `details` array that
   * is not there.
   */
  it('answers a malformed JSON body with BAD_REQUEST rather than VALIDATION_ERROR', async () => {
    const response = await ctx.t
      .http()
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"someone@example.com","password":}');

    expect(response.status).toBe(400);
    expect(errorOf(response).code).toBe('BAD_REQUEST');
  });

  it('still answers a schema failure with VALIDATION_ERROR and its field details', async () => {
    const response = await ctx.t.http().post('/auth/login').send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(400);
    const error = errorOf(response);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details.map((issue) => issue.path)).toContain('email');
  });

  it('carries a null data alongside every error so the shape never varies', async () => {
    const response = await ctx.t.http().post('/auth/login').send({ email: 'not-an-email', password: '' });

    expect(bodyOf(response)).toMatchObject({ success: false, data: null });
    expect(Object.keys(response.body as object).sort()).toEqual(['data', 'error', 'success']);
  });
});
