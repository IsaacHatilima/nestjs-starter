import request from 'supertest';
import type { App } from 'supertest/types';

const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

/** Preserve supertest's chain; awaiting a response also delivers queued mail deterministically. */
export function httpWithMail(server: App, deliver: () => Promise<void>): request.Agent {
  const agent = request(server);
  return new Proxy(agent, {
    get(target, property, receiver): unknown {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof property !== 'string' || !METHODS.has(property) || typeof value !== 'function') return value;
      return (...args: unknown[]): request.Test => {
        const test = Reflect.apply(value, target, args) as request.Test;
        const then = test.then.bind(test);
        test.then = (fulfilled, rejected) =>
          then(async (response) => {
            await deliver();
            return response;
          }).then(fulfilled, rejected);
        return test;
      };
    },
  });
}
