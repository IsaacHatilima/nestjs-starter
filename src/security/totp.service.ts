import { Inject, Injectable } from '@nestjs/common';
import { generate, generateSecret, generateURI, verify } from 'otplib';
import { toDataURL } from 'qrcode';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';

/** One step of drift either way, as authenticator apps expect. */
const EPOCH_TOLERANCE_SECONDS = 30;

export type TotpVerification = { valid: true; timeStep: number } | { valid: false };

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '');
}

@Injectable()
export class TotpService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  generateSecret(): string {
    return generateSecret();
  }

  buildOtpauthUri(accountLabel: string, secret: string): string {
    return generateURI({
      issuer: this.env.TWO_FACTOR_ISSUER,
      label: accountLabel,
      secret,
    });
  }

  renderQrCodeDataUrl(uri: string): Promise<string> {
    return toDataURL(uri);
  }

  /** Generates the current code; only used by tests and tooling. */
  generateCode(secret: string): Promise<string> {
    return generate({ secret });
  }

  async verify(secret: string, code: string, lastUsedStep: number | null): Promise<TotpVerification> {
    // One step of drift either way, and never a step at or before the last accepted one.
    const result = await verify({
      secret,
      token: normalizeCode(code),
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
      afterTimeStep: lastUsedStep ?? undefined,
    });
    if (!result.valid || !('timeStep' in result)) return { valid: false };
    return { valid: true, timeStep: result.timeStep };
  }
}
