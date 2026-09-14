import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';
import { ENV } from './env.token';

// Tests read .env.test so they can never point at the development database.
const envFilePath = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ envFilePath, validate: validateEnv })],
  // ConfigModule.forRoot() loads the file into process.env synchronously, so validating
  // process.env here sees both the file and real environment variables (which win).
  providers: [{ provide: ENV, useFactory: () => validateEnv(process.env) }],
  exports: [ENV],
})
export class AppConfigModule {}
