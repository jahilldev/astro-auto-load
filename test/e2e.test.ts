import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixtureDir = join(__dirname, 'e2e');

/**
 * E2E tests verify that loaders execute correctly in a real Astro SSR environment.
 *
 * Test Coverage:
 * 1. ✅ Parallel Execution: All rendered component loaders execute concurrently
 * 2. ✅ Selective Execution: Only RENDERED components execute their loaders
 *    - Components not imported don't execute (UnusedComponent)
 *    - Components imported but not rendered don't execute (ConditionalComponent when false)
 *    - Components conditionally rendered DO execute when rendered (ConditionalComponent when true)
 * 3. ✅ Zero Waste: No loader executes unless its component actually renders
 */
describe('E2E Parallel Execution', () => {
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
      astroProcess = spawn('npx', ['astro', 'dev', '--port', '4567'], {
        cwd: fixtureDir,
        stdio: 'pipe',
      });

      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);

      astroProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('[Astro]', output);
        if (output.includes('Local') && output.includes('4567')) {
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

  it('should execute loaders in parallel during SSR', async () => {
    expect(serverReady).toBe(true);

    const response = await fetch('http://localhost:4567/');
    expect(response.ok).toBe(true);

    const html = await response.text();
    
    const slow1Match = html.match(/data-component="slow1" data-start="(\d+)"/);
    const slow2Match = html.match(/data-component="slow2" data-start="(\d+)"/);
    const slow3Match = html.match(/data-component="slow3" data-start="(\d+)"/);

    expect(slow1Match).toBeTruthy();
    expect(slow2Match).toBeTruthy();
    expect(slow3Match).toBeTruthy();

    const start1 = parseInt(slow1Match![1]);
    const start2 = parseInt(slow2Match![1]);
    const start3 = parseInt(slow3Match![1]);

    const diff1_2 = Math.abs(start2 - start1);
    const diff1_3 = Math.abs(start3 - start1);
    const diff2_3 = Math.abs(start3 - start2);

    expect(diff1_2).toBeLessThan(20);
    expect(diff1_3).toBeLessThan(20);
    expect(diff2_3).toBeLessThan(20);

    expect(html).toContain('Slow1:');
    expect(html).toContain('Slow2:');
    expect(html).toContain('Slow3:');

    // Verify conditional loader did NOT execute (imported but not rendered)
    const conditionalMatch = html.match(/data-component="conditional"/);
    expect(conditionalMatch).toBeNull();

    // Verify conditional loader did NOT execute (not imported at all)
    const unusedMatch = html.match(/data-component="unused"/);
    expect(unusedMatch).toBeNull();
  }, 15000);

  it('should execute conditionally rendered component loaders when they render', async () => {
    expect(serverReady).toBe(true);

    // Fetch page with query param to trigger conditional rendering
    const response = await fetch('http://localhost:4567/?showConditional=true');
    expect(response.ok).toBe(true);

    const html = await response.text();

    // Verify conditional component executed when rendered
    const conditionalMatch = html.match(
      /data-component="conditional" data-start="(\d+)" data-duration="(\d+)"/,
    );
    expect(conditionalMatch).toBeTruthy();
    
    const conditionalStart = parseInt(conditionalMatch![1]);
    
    // Also verify it ran in parallel with the others
    const slow1Match = html.match(/data-component="slow1" data-start="(\d+)"/);
    const start1 = parseInt(slow1Match![1]);
    
    const diff = Math.abs(conditionalStart - start1);
    expect(diff).toBeLessThan(20); // Ran in parallel
  }, 15000);
});
