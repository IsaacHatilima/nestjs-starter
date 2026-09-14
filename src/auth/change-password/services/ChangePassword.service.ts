import { Injectable } from '@nestjs/common';
import { invalidCredentials } from '@/common/errors/auth-errors';
import { assertPasswordUsable } from '@/auth/shared/services/assert-password-usable';
import { PasswordBlocklist } from '@/security/password-blocklist.service';
import type { AuthPrincipal } from '@/security/auth-principal';
import { PasswordHasher } from '@/security/password-hasher.service';
import { ChangePasswordRepository } from '@/auth/change-password/repositories/ChangePassword.repository';
import type { ChangePassword } from '@/auth/change-password/schemas/ChangePassword.schema';

/** Changes the password and signs out every other session; the caller stays logged in. */
@Injectable()
export class ChangePasswordService {
  constructor(
    private readonly repository: ChangePasswordRepository,
    private readonly hasher: PasswordHasher,
    private readonly blocklist: PasswordBlocklist,
  ) {}

  async handle(auth: AuthPrincipal, data: ChangePassword): Promise<void> {
    // The current password is re-checked even though the caller holds a valid token (stolen-session defence).
    const currentHash = await this.repository.findPasswordHash(auth.userId);
    const matches = currentHash !== null && (await this.hasher.verify(currentHash, data.currentPassword));
    if (!matches) throw invalidCredentials();
    await assertPasswordUsable(this.blocklist, data.newPassword);

    await this.repository.changePassword(auth.userId, await this.hasher.hash(data.newPassword), auth.sessionId);
  }
}
