import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@/common/errors/app-error';
import { ErrorCode } from '@/common/errors/error-codes';
import { AccessTokenGuard } from '@/security/access-token.guard';
import { ActiveSessionRepository } from '@/security/active-session.repository';
import { Public } from '@/security/decorators/public.decorator';
import { TokenService } from '@/security/token.service';

class OpenController {
  @Public()
  open() {}
}
class ClosedController {
  closed() {}
}

type Handler = (...args: unknown[]) => unknown;

/** Reads a prototype method the way Nest's router does, without binding it. */
function handlerOf(controller: { prototype: object }, name: string): Handler {
  const descriptor = Object.getOwnPropertyDescriptor(controller.prototype, name);
  if (!descriptor) throw new Error(`${name} is not defined`);
  return descriptor.value as Handler;
}

function contextFor(headers: Record<string, string>, handler: Handler, controller: new () => unknown) {
  const request: Record<string, unknown> = { headers };
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
  throw new Error('expected rejection');
}

describe('AccessTokenGuard', () => {
  const tokens = { verifyAccessToken: jest.fn() };
  const sessions = { findActive: jest.fn() };
  const guard = new AccessTokenGuard(
    new Reflector(),
    tokens as unknown as TokenService,
    sessions as unknown as ActiveSessionRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('lets routes marked @Public through without a token', async () => {
    const { context } = contextFor({}, handlerOf(OpenController, 'open'), OpenController);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects a request without a bearer token', async () => {
    const { context } = contextFor({}, handlerOf(ClosedController, 'closed'), ClosedController);

    expect(await codeOf(guard.canActivate(context))).toBe(ErrorCode.INVALID_TOKEN);
  });

  it('rejects a token whose session was revoked or expired', async () => {
    tokens.verifyAccessToken.mockResolvedValue({
      userId: 'u1',
      sessionId: 's1',
    });
    sessions.findActive.mockResolvedValue(null);
    const { context } = contextFor(
      { authorization: 'Bearer abc' },
      handlerOf(ClosedController, 'closed'),
      ClosedController,
    );

    expect(await codeOf(guard.canActivate(context))).toBe(ErrorCode.SESSION_REVOKED);
    expect(sessions.findActive).toHaveBeenCalledWith('s1');
  });

  it('attaches the authenticated principal to the request', async () => {
    tokens.verifyAccessToken.mockResolvedValue({
      userId: 'u1',
      sessionId: 's1',
    });
    sessions.findActive.mockResolvedValue({ id: 's1', userId: 'u1' });
    const { context, request } = contextFor(
      { authorization: 'Bearer abc' },
      handlerOf(ClosedController, 'closed'),
      ClosedController,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual({ userId: 'u1', sessionId: 's1' });
    expect(tokens.verifyAccessToken).toHaveBeenCalledWith('abc');
  });
});
