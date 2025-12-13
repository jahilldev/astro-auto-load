import { describe, it, expect, vi } from 'vitest';
import { createLoaderExecutor } from '../src/runtime/orchestrator.js';
import { registerLoader, initializeRequestRegistry } from '../src/runtime/registry.js';

describe('Sequential await behavior', () => {
  it('should execute loaders in parallel even when awaited sequentially', async () => {
    await initializeRequestRegistry(async () => {
      const startTimes: number[] = [];

      const loader1 = vi.fn(async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: 'loader1' };
      });

      const loader2 = vi.fn(async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'loader2' };
      });

      const loader3 = vi.fn(async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 75));
        return { data: 'loader3' };
      });

      registerLoader('module1', loader1);
      registerLoader('module2', loader2);
      registerLoader('module3', loader3);

      const executor = createLoaderExecutor({
        params: {},
        request: new Request('http://localhost/test'),
      });

      const startTime = Date.now();

      // Simulate how Astro components would execute - SEQUENTIALLY awaiting
      // This is the real-world pattern:
      // Component1: const data = await getData()
      // Component2: const data = await getData() 
      // Component3: const data = await getData()
      const data1 = await executor.getData('module1');
      const data2 = await executor.getData('module2');
      const data3 = await executor.getData('module3');

      const totalTime = Date.now() - startTime;

      // If sequential: would take ~225ms (100+50+75)
      // If parallel: should take ~100ms (longest loader)
      // This test will FAIL if loaders execute sequentially
      expect(totalTime).toBeLessThan(150); // Should be ~100ms, not ~225ms
      expect(totalTime).toBeGreaterThan(90);

      // All loaders should start at roughly the same time
      if (startTimes.length >= 2) {
        const timeDiff1 = Math.abs(startTimes[1] - startTimes[0]);
        const timeDiff2 = Math.abs(startTimes[2] - startTimes[0]);
        expect(timeDiff1).toBeLessThan(10);
        expect(timeDiff2).toBeLessThan(10);
      }

      expect(data1).toEqual({ data: 'loader1' });
      expect(data2).toEqual({ data: 'loader2' });
      expect(data3).toEqual({ data: 'loader3' });
    });
  });
});
