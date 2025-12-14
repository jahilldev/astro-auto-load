import { getRegistry } from './registry.js';
import { createLoaderContext } from './context.js';
import type { Context, LoaderFn } from './types.js';

export interface RunAllLoadersOptions {
  params: Record<string, string>;
  request: Request;
  extend?: () => Record<string, any>;
}

/**
 * LazyLoaderExecutor tracks which loaders are requested during render
 * and executes them all in parallel when the first one is awaited.
 *
 * This ensures:
 * - Only loaders for rendered components execute
 * - All needed loaders execute in parallel (no waterfalls)
 * - Each loader runs exactly once per request
 *
 * Strategy: Queue all getData() calls, then batch execute on microtask
 */
export class LazyLoaderExecutor {
  private context: Context;
  private registry: Map<string, LoaderFn>;
  private results = new Map<string, unknown>();
  private errors = new Map<string, Error>();
  private requestedLoaders = new Set<string>();
  private batchPromise: Promise<void> | null = null;
  private isBatchScheduled = false;

  constructor(context: Context, registry: Map<string, LoaderFn>) {
    this.context = context;
    this.registry = registry;
  }

  /**
   * Request data from a specific loader.
   * Queues the loader for execution and returns a promise that resolves when done.
   * All getData() calls during the entire render share the same batch.
   */
  async getData(moduleUrl: string): Promise<unknown> {
    // Add to the batch
    this.requestedLoaders.add(moduleUrl);

    // If this loader wasn't executed in a previous batch, and a batch already completed,
    // we need to schedule a new batch for late arrivals
    if (
      this.isBatchScheduled &&
      !this.results.has(moduleUrl) &&
      !this.errors.has(moduleUrl)
    ) {
      //Reset and schedule new batch
      this.batchPromise = null;
      this.isBatchScheduled = false;
    }

    // Schedule batch execution if not already scheduled
    if (!this.batchPromise) {
      this.isBatchScheduled = true;
      // Wait for registry to stabilize before executing batch
      // This allows nested components to register their loaders
      this.batchPromise = this.waitForRegistryStability().then(() => this.executeBatch());
    }

    // Wait for the batch to complete
    await this.batchPromise;

    // Check if this specific loader had an error
    if (this.errors.has(moduleUrl)) {
      throw this.errors.get(moduleUrl);
    }

    return this.results.get(moduleUrl);
  }

  /**
   * Wait for the registry to stabilize (no new loaders being added).
   * OPTIMIZED: Use aggressive early execution with dynamic batch extension
   */
  private async waitForRegistryStability(): Promise<void> {
    let lastSize = this.registry.size;
    let stableCount = 0;
    const requiredStableChecks = 3; // REDUCED from 10 - execute faster!

    // Quick check: if registry is empty or already stable, only wait briefly
    await new Promise((resolve) => setImmediate(resolve));
    if (this.registry.size === lastSize && this.registry.size > 0) {
      // Registry might already be stable, do a few quick checks
      for (let i = 0; i < requiredStableChecks; i++) {
        await new Promise((resolve) => setImmediate(resolve));
        if (this.registry.size !== lastSize) {
          // Size changed, needs more time
          lastSize = this.registry.size;
          stableCount = 0;
          break;
        }
        stableCount++;
      }
      
      if (stableCount >= requiredStableChecks) {
        // Confirmed stable
        return;
      }
    }

    // If we get here, registry is still changing - wait for it to stabilize
    while (stableCount < requiredStableChecks) {
      await new Promise((resolve) => setImmediate(resolve));
      const currentSize = this.registry.size;

      if (currentSize === lastSize) {
        stableCount++;
      } else {
        stableCount = 0; // Reset if size changed
        lastSize = currentSize;
      }
    }
  }

  /**
   * Execute all registered loaders in parallel.
   * Executes ALL loaders in the registry (not just the one that triggered getData).
   * This ensures all components that rendered and registered their loaders execute together.
   * The setImmediate ensures all synchronous registration completes before execution starts.
   */
  private async executeBatch(): Promise<void> {
    // Execute ALL registered loaders
    const loadersToExecute = Array.from(this.registry.entries());
    
    console.log(`[orchestrator] Executing batch of ${loadersToExecute.length} loaders in parallel`);
    const batchStart = Date.now();

    const executions = loadersToExecute.map(async ([moduleUrl, loader]) => {
      // Skip if already executed
      if (this.results.has(moduleUrl) || this.errors.has(moduleUrl)) {
        return;
      }

      try {
        const result = await loader(this.context);
        this.results.set(moduleUrl, result);
      } catch (error) {
        this.errors.set(moduleUrl, error as Error);
      }
    });

    await Promise.all(executions);
    
    const batchTime = Date.now() - batchStart;
    console.log(`[orchestrator] Batch completed in ${batchTime}ms`);
  }
}

/**
 * Create a lazy loader executor for a request.
 * This doesn't execute any loaders until they're requested via getData().
 */
export function createLoaderExecutor(options: RunAllLoadersOptions): LazyLoaderExecutor {
  const { params, request, extend } = options;
  const context = createLoaderContext({ params, request, extend });
  const registry = getRegistry();

  return new LazyLoaderExecutor(context, registry);
}
