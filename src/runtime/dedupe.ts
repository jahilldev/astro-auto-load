type AnyAsyncFn<T = any> = (...args: any[]) => Promise<T>;

export function promiseDedupe() {
  const cache = new Map<string, Promise<any>>();

  function keyFrom(fn: AnyAsyncFn, args: any[]) {
    return fn.name + ':' + JSON.stringify(args);
  }

  return function dedupe<T>(fn: AnyAsyncFn<T>, ...args: any[]): Promise<T> {
    const key = keyFrom(fn, args);
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key)! as Promise<T>;
  };
}
