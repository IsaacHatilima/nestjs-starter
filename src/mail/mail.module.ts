import { Global, Module } from '@nestjs/common';
import { DeliverEmailModule } from './deliver-email/deliver-email.module';
import { MailSharedModule } from './shared/shared.module';

@Global()
@Module({
  imports: [MailSharedModule, DeliverEmailModule],
  exports: [MailSharedModule],
})
export class MailModule {}
