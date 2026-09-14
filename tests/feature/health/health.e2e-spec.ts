import { bodyOf, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('GET /health (e2e)', () => {
  it('answers inside the success envelope', async () => {
    const response = await ctx.t.http().get('/health').expect(200);

    expect(bodyOf(response)).toEqual({ success: true, data: { status: 'ok' }, error: null });
  });
});
