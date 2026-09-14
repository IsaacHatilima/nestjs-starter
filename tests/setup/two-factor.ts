import { generate } from 'otplib';
import { bearer, dataOf, PASSWORD, TestApp } from './test-app';

const STEP_SECONDS = 30;

export interface TotpSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface Enrolment {
  secret: string;
  recoveryCodes: readonly string[];
  /** The time step enrolment consumed. Replay protection refuses this step and every earlier one. */
  step: number;
}

const stepOf = (epochSeconds: number): number => Math.floor(epochSeconds / STEP_SECONDS);

/**
 * A code for the step straight after `afterStep`, the step the server has already consumed.
 *
 * Because {@link enroll} deliberately spends the *previous* step, this returns the code for the step the clock is in
 * now, which the verifier accepts anywhere in a 90-second window. Generating a code for a future step instead would
 * only be valid while the clock stayed close to it, which made slow runs fail at random.
 */
export const codeAfter = (secret: string, afterStep: number): Promise<string> =>
  generate({ secret, epoch: (afterStep + 1) * STEP_SECONDS });

export async function setupTotp(t: TestApp, accessToken: string): Promise<TotpSetup> {
  const response = await t.http().post('/auth/setup-totp').set(bearer(accessToken)).expect(200);
  return dataOf<TotpSetup>(response);
}

/** Runs setup and enable, returning the secret, the one-time recovery codes and the step enrolment consumed. */
export async function enroll(t: TestApp, accessToken: string): Promise<Enrolment> {
  const { secret } = await setupTotp(t, accessToken);
  // Enrol with the previous step's code, which the one-step drift tolerance accepts. That leaves the current step
  // unspent, so every later code in the test is a current-step code rather than a bet on the clock not moving.
  const epoch = Math.floor(Date.now() / 1000) - STEP_SECONDS;
  const response = await t
    .http()
    .post('/auth/enable-totp')
    .set(bearer(accessToken))
    .send({ code: await generate({ secret, epoch }) })
    .expect(200);
  return {
    secret,
    recoveryCodes: dataOf<{ recoveryCodes: string[] }>(response).recoveryCodes,
    step: stepOf(epoch),
  };
}

/** Logs in an enrolled user and returns the two-factor challenge token. */
export async function challenge(t: TestApp, email: string): Promise<string> {
  const response = await t.http().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
  const data = dataOf<{ status: string; challengeToken: string }>(response);
  if (data.status !== 'two_factor_required') throw new Error(`login returned ${data.status}`);
  return data.challengeToken;
}
