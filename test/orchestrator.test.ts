import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createLazyLoaderExecutor,
  LazyLoaderExecutor,
} from '../src/runtime/orchestrator.js';
import { registerLoader, getRegistry, initializeRequestRegistry } from '../src/runtime/registry.js';

describe('Orchestrator', () => {
  it('should only execute loaders that are registered for this request', async () => {
    await initializeRequestRegistry(async () => {
      const loader1 = vi.fn(async () => ({ data: 'loader1' }));
      const loader2 = vi.fn(async () => ({ data: 'loader2' }));
      const loader3 = vi.fn(async () => ({ data: 'loader3' }));

      registerLoader('module1', loader1);
      registerLoader('module2', loader2);
      registerLoader('module3', loader3);

      const executor = createLazyLoaderExecutor({
        params: {},
        request: new Request('http://localhost/test'),
      });

      // Request loader1 and loader3 in parallel (before any await)
    const promise1 = executor.getData('module1');
    const promise3 = executor.getData('module3');
    
    const [data1, data3] = await Promise.all([promise1, promise3]);

    // All registered loaders execute (module1, module2, module3)
    // This ensures deeply nested components don't get missed
    expect(loader1).toHaveBeenCalledTimes(1);
    expect(loader2).toHaveBeenCalledTimes(1); // Executed even though not requested
    expect(loader3).toHaveBeenCalledTimes(1);

    expect(data1).toEqual({ data: 'loader1' });
    expect(data3).toEqual({ data: 'loader3' });
    });
  });

  it('should execute all requested loaders in parallel', async () => {
    await initializeRequestRegistry(async () => {
      const executionOrder: number[] = [];
      const startTimes: number[] = [];

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

      registerLoader('module1', loader1);
      registerLoader('module2', loader2);
      registerLoader('module3', loader3);

      const executor = createLazyLoaderExecutor({
        params: {},
        request: new Request('http://localhost/test'),
      });

      const startTime = Date.now();

      // Request all three in quick succession (simulating nested components)
      const promise1 = executor.getData('module1');
      const promise2 = executor.getData('module2');
      const promise3 = executor.getData('module3');

      await Promise.all([promise1, promise2, promise3]);

      const totalTime = Date.now() - startTime;

      // All loaders should start at roughly the same time (within 10ms)
      const timeDiff1 = Math.abs(startTimes[1] - startTimes[0]);
      const timeDiff2 = Math.abs(startTimes[2] - startTimes[0]);
      expect(timeDiff1).toBeLessThan(10);
      expect(timeDiff2).toBeLessThan(10);

      // Total time should be ~100ms (longest loader), not ~225ms (sequential)
      expect(totalTime).toBeLessThan(150);
      expect(totalTime).toBeGreaterThan(90);
    });
  });

  it('should cache results and not re-execute loaders', async () => {
    await initializeRequestRegistry(async () => {
      const loader = vi.fn(async () => ({ data: 'test', random: Math.random() }));

      registerLoader('module1', loader);

      const executor = createLazyLoaderExecutor({
        params: {},
        request: new Request('http://localhost/test'),
      });

      // Request the same loader multiple times
      const data1 = await executor.getData('module1');
      const data2 = await executor.getData('module1');
      const data3 = await executor.getData('module1');

      // Loader should only be called once
      expect(loader).toHaveBeenCalledTimes(1);

      // All results should be identical (same object reference)
      expect(data1).toBe(data2);
      expect(data2).toBe(data3);
    });
  });

  it('should pass context to loaders', async () => {
    await initializeRequestRegistry(async () => {
      const loader = vi.fn(async (context) => {
        return {
          params: context.params,
          url: context.url.pathname,
        };
      });

      registerLoader('module1', loader);

      const executor = createLazyLoaderExecutor({
        params: { id: '123', slug: 'test' },
        request: new Request('http://localhost/posts/123'),
      });

      const data = await executor.getData('module1');

      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { id: '123', slug: 'test' },
          url: expect.any(URL),
          request: expect.any(Request),
          dedupe: expect.any(Function),
        }),
      );

      expect(data).toEqual({
        params: { id: '123', slug: 'test' },
        url: '/posts/123',
      });
    });
  });

  it('should handle loader errors gracefully', async () => {
    await initializeRequestRegistry(async () => {
      const workingLoader = vi.fn(async () => ({ data: 'success' }));
      const failingLoader = vi.fn(async () => {
        throw new Error('Loader failed');
      });

      registerLoader('working', workingLoader);
      registerLoader('failing', failingLoader);

      const executor = createLazyLoaderExecutor({
        params: {},
        request: new Request('http://localhost/test'),
      });

      // Request both in parallel (before await) - simulates real component rendering
      const workingPromise = executor.getData('working');
      const failingPromise = executor.getData('failing');

      // Working loader should succeed
      const workingData = await workingPromise;
      expect(workingData).toEqual({ data: 'success' });

      // Failing loader should throw
      await expect(failingPromise).rejects.toThrow('Loader failed');

      expect(workingLoader).toHaveBeenCalled();
      expect(failingLoader).toHaveBeenCalled();
    });
  });

  it('should support custom context properties via extend', async () => {
    await initializeRequestRegistry(async () => {
      const loader = vi.fn(async (context: any) => {
        return {
          customProp: context.customProp,
          db: context.db?.name,
        };
      });

      registerLoader('module1', loader);

      const executor = createLazyLoaderExecutor({
        params: {},
        request: new Request('http://localhost/test'),
        extend: () => ({
          customProp: 'custom-value',
          db: { name: 'test-db' },
        }),
      });

      const data = await executor.getData('module1');

      expect(data).toEqual({
        customProp: 'custom-value',
        db: 'test-db',
      });
    });
  });
});

