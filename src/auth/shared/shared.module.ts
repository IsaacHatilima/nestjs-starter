import { Module } from '@nestjs/common';
import { RecoveryCodeRepository } from './repositories/RecoveryCode.repository';
import { SessionRepository } from './repositories/Session.repository';
import { UserRepository } from './repositories/User.repository';
import { VerificationTokenRepository } from './repositories/VerificationToken.repository';

const repositories = [UserRepository, SessionRepository, VerificationTokenRepository, RecoveryCodeRepository];

/** Table access that more than one flow needs. Flow modules import this; single-use SQL stays in the flow. */
@Module({
  providers: repositories,
  exports: repositories,
})
export class SharedModule {}
