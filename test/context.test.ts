import { describe, it, expect } from 'vitest';
import { createLoaderContext } from '../src/runtime/context.js';

describe('Context', () => {
  it('should create context with params, url, and request', () => {
    const params = { id: '123', slug: 'test' };
    const request = new Request('http://localhost/posts/123');

    const context = createLoaderContext({ params, request });

    expect(context.params).toEqual(params);
    expect(context.url).toBeInstanceOf(URL);
    expect(context.url.pathname).toBe('/posts/123');
    expect(context.request).toBe(request);
    expect(context.dedupe).toBeInstanceOf(Function);
  });

  it('should create dedupe function that works', async () => {
    const request = new Request('http://localhost/test');
    const context = createLoaderContext({ params: {}, request });

    let callCount = 0;
    const fn = async () => {
      callCount++;
      return { count: callCount };
    };

    // Concurrent calls should be deduped
    const [result1, result2] = await Promise.all([
      context.dedupe('test-key', fn),
      context.dedupe('test-key', fn),
    ]);

    expect(callCount).toBe(1);
    expect(result1).toEqual({ count: 1 });
    expect(result2).toEqual({ count: 1 });
  });

  it('should extend context with custom properties', () => {
    const request = new Request('http://localhost/test');
    const context = createLoaderContext({
      params: {},
      request,
      extend: () => ({
        db: { name: 'test-db' },
        auth: { user: 'test-user' },
      }),
    });

    expect(context.params).toEqual({});
    expect((context as any).db).toEqual({ name: 'test-db' });
    expect((context as any).auth).toEqual({ user: 'test-user' });
    expect(context.dedupe).toBeInstanceOf(Function);
  });

  it('should preserve base properties when extending', () => {
    const request = new Request('http://localhost/test');
    const params = { id: '123' };

    const context = createLoaderContext({
      params,
      request,
      extend: () => ({
        custom: 'value',
      }),
    });

    // Base properties should still exist
    expect(context.params).toEqual(params);
    expect(context.url).toBeInstanceOf(URL);
    expect(context.request).toBe(request);
    expect(context.dedupe).toBeInstanceOf(Function);

    // Custom property should be added
    expect((context as any).custom).toBe('value');
  });

  it('should allow extend to add to but may override base properties', () => {
    const request = new Request('http://localhost/test');
    const params = { id: '123' };

    const context = createLoaderContext({
      params,
      request,
      extend: () => ({
        newProp: 'added',
      }),
    });

    // Base properties should exist
    expect(context.params).toEqual(params);
    // Extended property should be added
    expect((context as any).newProp).toBe('added');

    // Note: Object.assign applies left-to-right, so extend() properties
    // will override base properties if they have the same key
  });
});
