type AnyAsyncFn<T = any> = () => Promise<T>;

export function promiseDedupe() {
  const cache = new Map<string, Promise<any>>();

  return function dedupe<T>(key: string, fn: AnyAsyncFn<T>): Promise<T> {
    if (!cache.has(key)) {
      cache.set(key, fn());
    }
    return cache.get(key)! as Promise<T>;
  };
}
