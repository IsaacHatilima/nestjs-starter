import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './auth/auth.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor';
import { AppConfigModule } from './config/app-config.module';
import type { Env } from './config/env.schema';
import { ENV } from './config/env.token';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { ProfileModule } from './profile/profile.module';
import { AccessTokenGuard } from './security/access-token.guard';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    // Global infrastructure first: each of these registers itself with @Global().
    AppConfigModule,
    DatabaseModule,
    SecurityModule,
    MailModule,
    // Rate limits come from the environment and are skipped entirely under NODE_ENV=test.
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ ttl: env.THROTTLE_TTL_MS, limit: env.THROTTLE_LIMIT }],
        skipIf: () => env.NODE_ENV === 'test',
      }),
    }),
    HealthModule,
    AuthModule,
    ProfileModule,
  ],
  providers: [
    // Request bodies are validated with the Zod DTOs domain-driver generates; responses are wrapped in one envelope.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Guards run in registration order: rate limit first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AppModule {}
