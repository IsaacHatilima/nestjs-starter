/** The arguments of the n-th call to a mock, typed by the caller. */
export function argsOf<T extends unknown[]>(mock: jest.Mock, call = 0): T {
  return mock.mock.calls[call] as T;
}

/** The first argument of the n-th call to a mock, typed by the caller. */
export function firstArg<T>(mock: jest.Mock, call = 0): T {
  return argsOf<[T]>(mock, call)[0];
}
