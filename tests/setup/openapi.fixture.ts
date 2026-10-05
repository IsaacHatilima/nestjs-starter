import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ApiResponseSchemaHost, OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { ChangePasswordController } from '@/auth/change-password/controllers/ChangePassword.controller';
import { DisableTotpController } from '@/auth/disable-totp/controllers/DisableTotp.controller';
import { EnableTotpController } from '@/auth/enable-totp/controllers/EnableTotp.controller';
import { ForgotPasswordController } from '@/auth/forgot-password/controllers/ForgotPassword.controller';
import { ListSessionsController } from '@/auth/list-sessions/controllers/ListSessions.controller';
import { LoginController } from '@/auth/login/controllers/Login.controller';
import { LogoutController } from '@/auth/logout/controllers/Logout.controller';
import { MeController } from '@/auth/me/controllers/Me.controller';
import { RefreshTokenController } from '@/auth/refresh-token/controllers/RefreshToken.controller';
import { RegenerateRecoveryCodesController } from '@/auth/regenerate-recovery-codes/controllers/RegenerateRecoveryCodes.controller';
import { RegisterController } from '@/auth/register/controllers/Register.controller';
import { ResendVerificationController } from '@/auth/resend-verification/controllers/ResendVerification.controller';
import { ResetPasswordController } from '@/auth/reset-password/controllers/ResetPassword.controller';
import { RevokeOtherSessionsController } from '@/auth/revoke-other-sessions/controllers/RevokeOtherSessions.controller';
import { RevokeSessionController } from '@/auth/revoke-session/controllers/RevokeSession.controller';
import { SetupTotpController } from '@/auth/setup-totp/controllers/SetupTotp.controller';
import { VerifyEmailController } from '@/auth/verify-email/controllers/VerifyEmail.controller';
import { VerifyTwoFactorController } from '@/auth/verify-two-factor/controllers/VerifyTwoFactor.controller';
import { UpdateProfileController } from '@/profile/update-profile/controllers/UpdateProfile.controller';

const controllers = [
  ChangePasswordController,
  DisableTotpController,
  EnableTotpController,
  ForgotPasswordController,
  ListSessionsController,
  LoginController,
  LogoutController,
  MeController,
  RefreshTokenController,
  RegenerateRecoveryCodesController,
  RegisterController,
  ResendVerificationController,
  ResetPasswordController,
  RevokeOtherSessionsController,
  RevokeSessionController,
  SetupTotpController,
  VerifyEmailController,
  VerifyTwoFactorController,
  UpdateProfileController,
];

/** Real controller/DTO metadata, with no application infrastructure or database providers. */
export async function createControllerDocument(): Promise<{ app: INestApplication; document: OpenAPIObject }> {
  const providers = controllers.flatMap((controller) => {
    const dependencies = Reflect.getMetadata('design:paramtypes', controller) as Type[];
    return dependencies.map((provide) => ({ provide, useValue: { handle: jest.fn() } }));
  });
  const moduleRef = await Test.createTestingModule({ controllers, providers }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build()));
  return { app, document };
}

export type ResponseSchema = ApiResponseSchemaHost['schema'];

export function responseSchema(
  document: OpenAPIObject,
  path: string,
  method: 'get' | 'post' | 'patch',
  status = '200',
): ResponseSchema {
  const operation = document.paths[path]?.[method];
  if (!operation) throw new Error(`missing operation ${method} ${path}`);
  const response = operation.responses[status];
  if (!response || '$ref' in response) throw new Error(`missing inline response ${status} ${path}`);
  const schema = response.content?.['application/json']?.schema;
  if (!schema) throw new Error(`missing response schema ${status} ${path}`);
  return schema;
}
