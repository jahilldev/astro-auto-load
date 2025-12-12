import { describe, it, expect, vi } from 'vitest';
import { promiseDedupe } from '../src/runtime/dedupe.js';

describe('Dedupe', () => {
  it('should deduplicate concurrent calls with the same key', async () => {
    const dedupe = promiseDedupe();
    const expensiveFn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { data: 'result' };
    });

    // Make 3 concurrent calls with the same key
    const promise1 = dedupe('test-key', expensiveFn);
    const promise2 = dedupe('test-key', expensiveFn);
    const promise3 = dedupe('test-key', expensiveFn);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    // Function should only be called once
    expect(expensiveFn).toHaveBeenCalledTimes(1);

    // All promises should resolve to the same result
    expect(result1).toEqual({ data: 'result' });
    expect(result2).toEqual({ data: 'result' });
    expect(result3).toEqual({ data: 'result' });
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it('should not deduplicate calls with different keys', async () => {
    const dedupe = promiseDedupe();
    const expensiveFn1 = vi.fn(async () => ({ data: 'result1' }));
    const expensiveFn2 = vi.fn(async () => ({ data: 'result2' }));

    const [result1, result2] = await Promise.all([
      dedupe('key1', expensiveFn1),
      dedupe('key2', expensiveFn2),
    ]);

    // Both functions should be called
    expect(expensiveFn1).toHaveBeenCalledTimes(1);
    expect(expensiveFn2).toHaveBeenCalledTimes(1);

    // Results should be different
    expect(result1).toEqual({ data: 'result1' });
    expect(result2).toEqual({ data: 'result2' });
  });

  it('should cache results for the lifetime of the dedupe instance', async () => {
    const dedupe = promiseDedupe();
    let callCount = 0;
    const expensiveFn = vi.fn(async () => {
      callCount++;
      return { data: `result-${callCount}` };
    });

    // First call
    const result1 = await dedupe('test-key', expensiveFn);
    expect(result1).toEqual({ data: 'result-1' });
    expect(expensiveFn).toHaveBeenCalledTimes(1);

    // Second call - should return cached result
    const result2 = await dedupe('test-key', expensiveFn);
    expect(result2).toEqual({ data: 'result-1' }); // Same cached result
    expect(expensiveFn).toHaveBeenCalledTimes(1); // Not called again
  });

  it('should handle errors correctly', async () => {
    const dedupe = promiseDedupe();
    const failingFn = vi.fn(async () => {
      throw new Error('Test error');
    });

    // Make concurrent calls that will fail
    const promise1 = dedupe('error-key', failingFn);
    const promise2 = dedupe('error-key', failingFn);

    await expect(promise1).rejects.toThrow('Test error');
    await expect(promise2).rejects.toThrow('Test error');

    // Function should only be called once even though it failed
    expect(failingFn).toHaveBeenCalledTimes(1);
  });

  it('should isolate cache per dedupe instance', async () => {
    const dedupe1 = promiseDedupe();
    const dedupe2 = promiseDedupe();

    let count1 = 0;
    let count2 = 0;

    const fn1 = vi.fn(async () => ({ count: ++count1 }));
    const fn2 = vi.fn(async () => ({ count: ++count2 }));

    // Same key, different dedupe instances
    const result1 = await dedupe1('test-key', fn1);
    const result2 = await dedupe2('test-key', fn2);

    // Both should execute since they're different instances
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ count: 1 });
    expect(result2).toEqual({ count: 1 });
  });

  it('should work with different data types', async () => {
    const dedupe = promiseDedupe();

    const stringResult = await dedupe('string', async () => 'test');
    const numberResult = await dedupe('number', async () => 42);
    const objectResult = await dedupe('object', async () => ({ key: 'value' }));
    const arrayResult = await dedupe('array', async () => [1, 2, 3]);

    expect(stringResult).toBe('test');
    expect(numberResult).toBe(42);
    expect(objectResult).toEqual({ key: 'value' });
    expect(arrayResult).toEqual([1, 2, 3]);
  });
});
