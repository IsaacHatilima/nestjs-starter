import { HttpException, HttpStatus } from '@nestjs/common';
import { FieldIssue } from '../envelope';
import { ErrorCode } from './error-codes';

/**
 * An HTTP error with a stable, machine-readable `code` that the response
 * envelope exposes to clients. Services throw these; the exception filter
 * renders them.
 */
export class AppError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: FieldIssue[],
  ) {
    super({ code, message, details }, status);
  }
}
