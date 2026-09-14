import { ArgumentsHost, BadRequestException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { AppError } from '@/common/errors/app-error';
import { ErrorCode } from '@/common/errors/error-codes';
import { HttpExceptionFilter } from '@/common/http-exception.filter';
import { firstArg } from '@tests/setup/mock-calls';

function fakeHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/auth/login' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('renders an AppError with its code, message and status', () => {
    const { host, status, json } = fakeHost();

    filter.catch(
      new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', HttpStatus.UNAUTHORIZED),
      host,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  });

  it('renders zod validation failures as VALIDATION_ERROR with field details', () => {
    const { host, status, json } = fakeHost();
    const parsed = z.object({ email: z.email() }).safeParse({ email: 'nope' });

    filter.catch(new ZodValidationException(parsed.error), host);

    expect(status).toHaveBeenCalledWith(400);
    const body = firstArg<{
      data: null;
      error: { code: string; details: { path: string; message: string }[] };
    }>(json);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0].path).toBe('email');
    expect(body.error.details[0].message).toEqual(expect.any(String));
  });

  /**
   * A 400 that never reached a schema — a malformed JSON body, a failed parse
   * pipe — carries no field details, so branding it VALIDATION_ERROR would
   * promise clients a `details` array that is not there.
   */
  it('renders a non-zod bad request as BAD_REQUEST rather than VALIDATION_ERROR', () => {
    const { host, status, json } = fakeHost();

    filter.catch(new BadRequestException('Unexpected token } in JSON at position 14'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(firstArg(json)).toEqual({
      success: false,
      data: null,
      error: { code: 'BAD_REQUEST', message: 'Unexpected token } in JSON at position 14' },
    });
  });

  it('renders throttling as RATE_LIMITED', () => {
    const { host, status, json } = fakeHost();

    filter.catch(new ThrottlerException(), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(firstArg(json)).toMatchObject({
      success: false,
      data: null,
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('maps other Nest http exceptions to a code derived from the status', () => {
    const { host, status, json } = fakeHost();

    filter.catch(new NotFoundException('Cannot GET /nope'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(firstArg(json)).toMatchObject({
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'Cannot GET /nope' },
    });
  });

  it('hides the details of unexpected errors behind INTERNAL_ERROR and logs them', () => {
    const { host, status, json } = fakeHost();
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    filter.catch(new Error('connection string leaked'), host);

    expect(logged).toHaveBeenCalledWith('POST /auth/login failed', expect.stringContaining('connection string leaked'));
    logged.mockRestore();

    expect(status).toHaveBeenCalledWith(500);
    expect(firstArg(json)).toEqual({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('always emits every envelope key so the shape never varies', () => {
    const { host, json } = fakeHost();

    filter.catch(new NotFoundException('Cannot GET /nope'), host);

    expect(Object.keys(firstArg<object>(json)).sort()).toEqual(['data', 'error', 'success']);
  });
});
