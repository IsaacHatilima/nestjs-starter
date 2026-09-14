import { bearer, dataOf, TestApp } from './test-app';

export interface SessionView {
  id: string;
  current: boolean;
  ip: string | null;
  userAgent: string | null;
}

export async function listSessions(t: TestApp, accessToken: string): Promise<SessionView[]> {
  const response = await t.http().get('/auth/list-sessions').set(bearer(accessToken)).expect(200);
  return dataOf<SessionView[]>(response);
}
