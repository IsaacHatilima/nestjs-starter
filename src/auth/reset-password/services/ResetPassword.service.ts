import { Injectable } from '@nestjs/common';
import { invalidToken } from '@/common/errors/auth-errors';
import { assertPasswordUsable } from '@/auth/shared/services/assert-password-usable';
import { PasswordBlocklist } from '@/security/password-blocklist.service';
import { PasswordHasher } from '@/security/password-hasher.service';
import { TokenService } from '@/security/token.service';
import { ResetPasswordRepository } from '@/auth/reset-password/repositories/ResetPassword.repository';
import type { ResetPassword } from '@/auth/reset-password/schemas/ResetPassword.schema';

@Injectable()
export class ResetPasswordService {
  constructor(
    private readonly repository: ResetPasswordRepository,
    private readonly tokens: TokenService,
    private readonly hasher: PasswordHasher,
    private readonly blocklist: PasswordBlocklist,
  ) {}

  async handle(data: ResetPassword): Promise<void> {
    // Hash first; the repository then consumes the token, stores the hash and revokes sessions in one transaction.
    await assertPasswordUsable(this.blocklist, data.password);
    const passwordHash = await this.hasher.hash(data.password);
    const reset = await this.repository.resetWithToken(this.tokens.hashOpaqueToken(data.token), passwordHash);
    if (!reset) throw invalidToken('Invalid or expired reset token');
  }
}
