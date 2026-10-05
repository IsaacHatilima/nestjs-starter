import request from 'supertest';
import type { App } from 'supertest/types';
import { httpWithMail } from '@tests/setup/http-with-mail';

jest.mock('supertest', () => jest.fn());

describe('httpWithMail', () => {
  afterEach(() => jest.resetAllMocks());

  it('preserves chained request methods and waits for mail delivery before resolving the response', async () => {
    const response = { status: 201, body: { success: true } } as request.Response;
    const responsePromise = Promise.resolve(response);
    const test = {
      then: responsePromise.then.bind(responsePromise),
      set: jest.fn().mockReturnThis(),
      expect: jest.fn().mockReturnThis(),
    };
    const get = jest.fn().mockReturnValue(test);
    jest.mocked(request).mockReturnValue({ get } as unknown as request.Agent);
    let completeDelivery: () => void = () => undefined;
    const deliver = jest.fn().mockReturnValue(new Promise<void>((resolve) => (completeDelivery = resolve)));
    const http = httpWithMail({} as App, deliver);
    const chain = http.get('/example').set('Origin', 'https://example.com').expect(201);
    let returned = false;
    const waiting = Promise.resolve(chain).then((result) => {
      returned = true;
      return result;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(get).toHaveBeenCalledWith('/example');
    expect(test.set).toHaveBeenCalledWith('Origin', 'https://example.com');
    expect(test.expect).toHaveBeenCalledWith(201);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(returned).toBe(false);
    completeDelivery();
    await expect(waiting).resolves.toBe(response);
  });
});
