import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

export const invalidCredentials = (): AppError =>
  new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', HttpStatus.UNAUTHORIZED);

/** NIST SP 800-63B-4 section 3.1.1 requires telling the subscriber why a password was refused. */
export const passwordCompromised = (reason: string): AppError =>
  new AppError(ErrorCode.PASSWORD_COMPROMISED, reason, HttpStatus.BAD_REQUEST);

export const invalidToken = (message = 'Invalid token'): AppError =>
  new AppError(ErrorCode.INVALID_TOKEN, message, HttpStatus.UNAUTHORIZED);

export const tokenExpired = (): AppError =>
  new AppError(ErrorCode.TOKEN_EXPIRED, 'Token has expired', HttpStatus.UNAUTHORIZED);

export const sessionRevoked = (): AppError =>
  new AppError(ErrorCode.SESSION_REVOKED, 'Session is no longer active', HttpStatus.UNAUTHORIZED);

export const emailNotVerified = (): AppError =>
  new AppError(ErrorCode.EMAIL_NOT_VERIFIED, 'Email address has not been verified', HttpStatus.FORBIDDEN);

export const emailAlreadyRegistered = (): AppError =>
  new AppError(ErrorCode.EMAIL_ALREADY_REGISTERED, 'An account with this email already exists', HttpStatus.CONFLICT);

export const invalidTwoFactorCode = (): AppError =>
  new AppError(ErrorCode.INVALID_TWO_FACTOR_CODE, 'Invalid two-factor code', HttpStatus.UNAUTHORIZED);

export const twoFactorNotEnabled = (): AppError =>
  new AppError(ErrorCode.TWO_FACTOR_NOT_ENABLED, 'Two-factor authentication is not enabled', HttpStatus.BAD_REQUEST);

export const twoFactorAlreadyEnabled = (): AppError =>
  new AppError(
    ErrorCode.TWO_FACTOR_ALREADY_ENABLED,
    'Two-factor authentication is already enabled',
    HttpStatus.CONFLICT,
  );

export const twoFactorNotSetup = (): AppError =>
  new AppError(ErrorCode.TWO_FACTOR_NOT_SETUP, 'Two-factor authentication has not been set up', HttpStatus.BAD_REQUEST);

export const notFound = (what: string): AppError =>
  new AppError(ErrorCode.NOT_FOUND, `${what} not found`, HttpStatus.NOT_FOUND);
