import { Module } from '@nestjs/common';
import { SecurityModule } from '@/security/security.module';
import { MailSharedModule } from '@/mail/shared/shared.module';
import { DeliverEmailRepository } from './repositories/DeliverEmail.repository';
import { DeliverEmailService } from './services/DeliverEmail.service';

@Module({
  imports: [MailSharedModule, SecurityModule],
  providers: [DeliverEmailService, DeliverEmailRepository],
  exports: [DeliverEmailService],
})
export class DeliverEmailModule {}
