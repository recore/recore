interface Mockable<T> {
  mock?: T;
}

export function mockable<T extends Function>(fn: T): T & Mockable<T> {
  const f: any = (...input: any[]) => {
    if (f.mock) {
      return f.mock(...input);
    }
    return fn(...input);
  };

  return f;
}

export const createApi = mockable;
