import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixtureDir = join(__dirname, 'e2e');

describe('Waterfall vs Parallel Comparison', () => {
  let astroProcess: ChildProcess;
  let serverReady = false;

  beforeAll(async () => {
    // Build the plugin first
    await new Promise<void>((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
      });
      build.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });

    // Start Astro dev server
    await new Promise<void>((resolve, reject) => {
      astroProcess = spawn('npx', ['astro', 'dev', '--port', '4568'], {
        cwd: fixtureDir,
        stdio: 'pipe',
      });

      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);

      astroProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('[Astro]', output);
        if (output.includes('Local') && output.includes('4568')) {
          serverReady = true;
          clearTimeout(timeout);
          // Wait a bit more to ensure server is fully ready
          setTimeout(resolve, 1000);
        }
      });

      astroProcess.stderr?.on('data', (data) => {
        console.error('[Astro Error]', data.toString());
      });

      astroProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }, 60000);

  afterAll(() => {
    if (astroProcess) {
      astroProcess.kill();
    }
  });

  it('demonstrates waterfall problem with traditional async components', async () => {
    expect(serverReady).toBe(true);
    const response = await fetch('http://localhost:4568/waterfall');
    const html = await response.text();

    // Extract durations from the rendered HTML
    const child1Match = html.match(/class="waterfall-child1" data-duration="(\d+)"/);
    const child2Match = html.match(/class="waterfall-child2" data-duration="(\d+)"/);
    const child3Match = html.match(/class="waterfall-child3" data-duration="(\d+)"/);

    expect(child1Match).toBeTruthy();
    expect(child2Match).toBeTruthy();
    expect(child3Match).toBeTruthy();

    const duration1 = parseInt(child1Match![1]);
    const duration2 = parseInt(child2Match![1]);
    const duration3 = parseInt(child3Match![1]);

    // Each component should take ~100ms
    expect(duration1).toBeGreaterThanOrEqual(95);
    expect(duration2).toBeGreaterThanOrEqual(95);
    expect(duration3).toBeGreaterThanOrEqual(95);

    // With waterfall, total time should be ~300ms (sequential)
    // We can't measure total time directly, but we know it's sequential
  }, 15000);

  it('demonstrates parallel execution with auto-load loaders', async () => {
    expect(serverReady).toBe(true);
    const start = Date.now();
    const response = await fetch('http://localhost:4568/parallel');
    const html = await response.text();
    const totalTime = Date.now() - start;

    // Extract durations from the rendered HTML
    const child1Match = html.match(/class="parallel-child1" data-duration="(\d+)"/);
    const child2Match = html.match(/class="parallel-child2" data-duration="(\d+)"/);
    const child3Match = html.match(/class="parallel-child3" data-duration="(\d+)"/);

    expect(child1Match).toBeTruthy();
    expect(child2Match).toBeTruthy();
    expect(child3Match).toBeTruthy();

    const duration1 = parseInt(child1Match![1]);
    const duration2 = parseInt(child2Match![1]);
    const duration3 = parseInt(child3Match![1]);

    // Each loader should take ~100ms
    expect(duration1).toBeGreaterThanOrEqual(95);
    expect(duration2).toBeGreaterThanOrEqual(95);
    expect(duration3).toBeGreaterThanOrEqual(95);

    // With parallel execution, total time should be ~100ms (not 300ms)
    // Adding generous buffer for test environment overhead
    expect(totalTime).toBeLessThan(250);
  }, 15000);

  it('parallel execution is significantly faster than waterfall', async () => {
    expect(serverReady).toBe(true);

    // Measure waterfall time
    const waterfallStart = Date.now();
    await fetch('http://localhost:4568/waterfall');
    const waterfallTime = Date.now() - waterfallStart;

    // Measure parallel time
    const parallelStart = Date.now();
    await fetch('http://localhost:4568/parallel');
    const parallelTime = Date.now() - parallelStart;

    // Parallel should be significantly faster
    // Waterfall: ~300ms (3 x 100ms sequential)
    // Parallel: ~100ms (3 x 100ms concurrent)
    // Parallel should be at least 2x faster (accounting for overhead)
    expect(parallelTime).toBeLessThan(waterfallTime * 0.6);

    console.log(`Waterfall time: ${waterfallTime}ms, Parallel time: ${parallelTime}ms`);
    console.log(`Speedup: ${(waterfallTime / parallelTime).toFixed(2)}x faster`);
  }, 15000);
});
