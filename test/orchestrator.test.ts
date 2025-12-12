import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runAllLoadersForRequest } from '../src/runtime/orchestrator.js';
import { registerLoader, getRegistry } from '../src/runtime/registry.js';

describe('Orchestrator', () => {
  beforeEach(() => {
    // Clear registry before each test
    getRegistry().clear();
  });

  it('should run loaders in parallel', async () => {
    const executionOrder: number[] = [];
    const startTimes: number[] = [];

    // Create loaders with different delays
    const loader1 = vi.fn(async () => {
      startTimes.push(Date.now());
      executionOrder.push(1);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { data: 'loader1' };
    });

    const loader2 = vi.fn(async () => {
      startTimes.push(Date.now());
      executionOrder.push(2);
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { data: 'loader2' };
    });

    const loader3 = vi.fn(async () => {
      startTimes.push(Date.now());
      executionOrder.push(3);
      await new Promise((resolve) => setTimeout(resolve, 75));
      return { data: 'loader3' };
    });

    // Register loaders
    registerLoader('module1', loader1);
    registerLoader('module2', loader2);
    registerLoader('module3', loader3);

    const startTime = Date.now();
    const result = await runAllLoadersForRequest({
      params: {},
      request: new Request('http://localhost/test'),
    });
    const totalTime = Date.now() - startTime;

    // All loaders should have been called
    expect(loader1).toHaveBeenCalledTimes(1);
    expect(loader2).toHaveBeenCalledTimes(1);
    expect(loader3).toHaveBeenCalledTimes(1);

    // All loaders should start at roughly the same time (within 10ms)
    const timeDiff1 = Math.abs(startTimes[1] - startTimes[0]);
    const timeDiff2 = Math.abs(startTimes[2] - startTimes[0]);
    expect(timeDiff1).toBeLessThan(10);
    expect(timeDiff2).toBeLessThan(10);

    // Total time should be ~100ms (longest loader), not ~225ms (sequential)
    expect(totalTime).toBeLessThan(150); // Some margin for execution
    expect(totalTime).toBeGreaterThan(90);

    // Data should be returned correctly
    expect(result.dataByModule.size).toBe(3);
    expect(result.dataByModule.get('module1')).toEqual({ data: 'loader1' });
    expect(result.dataByModule.get('module2')).toEqual({ data: 'loader2' });
    expect(result.dataByModule.get('module3')).toEqual({ data: 'loader3' });
  });

  it('should pass context to loaders', async () => {
    const loader = vi.fn(async (context) => {
      return {
        params: context.params,
        url: context.url.pathname,
      };
    });

    registerLoader('module1', loader);

    const result = await runAllLoadersForRequest({
      params: { id: '123', slug: 'test' },
      request: new Request('http://localhost/posts/123'),
    });

    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: '123', slug: 'test' },
        url: expect.any(URL),
        request: expect.any(Request),
        dedupe: expect.any(Function),
      }),
    );

    const data = result.dataByModule.get('module1') as any;
    expect(data.params).toEqual({ id: '123', slug: 'test' });
    expect(data.url).toBe('/posts/123');
  });

  it('should handle loader errors gracefully', async () => {
    const workingLoader = vi.fn(async () => ({ data: 'success' }));
    const failingLoader = vi.fn(async () => {
      throw new Error('Loader failed');
    });

    registerLoader('working', workingLoader);
    registerLoader('failing', failingLoader);

    await expect(
      runAllLoadersForRequest({
        params: {},
        request: new Request('http://localhost/test'),
      }),
    ).rejects.toThrow();

    expect(workingLoader).toHaveBeenCalled();
    expect(failingLoader).toHaveBeenCalled();
  });

  it('should support custom context properties via extend', async () => {
    const loader = vi.fn(async (context: any) => {
      return {
        customProp: context.customProp,
        db: context.db?.name,
      };
    });

    registerLoader('module1', loader);

    const result = await runAllLoadersForRequest({
      params: {},
      request: new Request('http://localhost/test'),
      extend: () => ({
        customProp: 'custom-value',
        db: { name: 'test-db' },
      }),
    });

    const data = result.dataByModule.get('module1') as any;
    expect(data.customProp).toBe('custom-value');
    expect(data.db).toBe('test-db');
  });

  it('should return empty map when no loaders registered', async () => {
    const result = await runAllLoadersForRequest({
      params: {},
      request: new Request('http://localhost/test'),
    });

    expect(result.dataByModule.size).toBe(0);
  });
});
