import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from '@/common/response-envelope.interceptor';

const context = {} as ExecutionContext;
const handlerReturning = (value: unknown): CallHandler => ({
  handle: () => of(value),
});

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor();

  it('wraps handler output in a success envelope carrying a null error', async () => {
    const body = await lastValueFrom(interceptor.intercept(context, handlerReturning({ id: 1 })));

    expect(body).toEqual({ success: true, data: { id: 1 }, error: null });
  });

  it('uses null data when the handler returns nothing', async () => {
    const body = await lastValueFrom(interceptor.intercept(context, handlerReturning(undefined)));

    expect(body).toEqual({ success: true, data: null, error: null });
  });

  it('always emits every envelope key so the shape never varies', async () => {
    const body = await lastValueFrom(interceptor.intercept(context, handlerReturning({ id: 1 })));

    expect(Object.keys(body).sort()).toEqual(['data', 'error', 'success']);
  });
});
