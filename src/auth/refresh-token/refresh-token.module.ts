import { Module } from '@nestjs/common';
import { RefreshTokenController } from './controllers/RefreshToken.controller';
import { RefreshTokenRepository } from './repositories/RefreshToken.repository';
import { RefreshTokenService } from './services/RefreshToken.service';

/** Wires the refresh-token flow: controller, service, repository. */
@Module({
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService, RefreshTokenRepository],
})
export class RefreshTokenModule {}
