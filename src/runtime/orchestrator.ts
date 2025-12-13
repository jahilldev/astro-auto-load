import { getRegistry } from './registry.js';
import { createLoaderContext } from './context.js';
import type { Context, LoaderFn } from './types.js';

export interface OrchestratorResult {
  context: Context;
  dataByModule: Map<string, unknown>;
}

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
   */
  async getData(moduleUrl: string): Promise<unknown> {
    // Add to the batch
    this.requestedLoaders.add(moduleUrl);

    // Schedule batch execution if not already scheduled
    if (!this.isBatchScheduled) {
      this.isBatchScheduled = true;
      this.batchPromise = Promise.resolve().then(() => this.executeBatch());
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
   * Eagerly execute ALL registered loaders in parallel.
   * This ensures nested components don't create waterfalls.
   * Call this from middleware for maximum performance.
   */
  executeAll(): void {
    if (this.isBatchScheduled) {
      return; // Already started
    }

    // Queue all registered loaders
    for (const moduleUrl of this.registry.keys()) {
      this.requestedLoaders.add(moduleUrl);
    }

    // Start batch execution
    this.isBatchScheduled = true;
    this.batchPromise = Promise.resolve().then(() => this.executeBatch());
  }

  /**
   * Wait for all loaders to complete execution.
   * Call this in middleware after executeAll() to ensure all data is ready before rendering.
   */
  async awaitAll(): Promise<void> {
    if (this.batchPromise) {
      await this.batchPromise;
    }
  }

  /**
   * Synchronously get data for a loader that has already completed.
   * This should only be called after awaitAll() has completed.
   */
  getDataSync(moduleUrl: string): unknown {
    // Check for errors first
    if (this.errors.has(moduleUrl)) {
      throw this.errors.get(moduleUrl);
    }

    return this.results.get(moduleUrl);
  }

  /**
   * Execute all queued loaders in parallel.
   */
  private async executeBatch(): Promise<void> {
    const loadersToExecute = Array.from(this.requestedLoaders);

    const executions = loadersToExecute.map(async (moduleUrl) => {
      // Skip if already executed
      if (this.results.has(moduleUrl) || this.errors.has(moduleUrl)) {
        return;
      }

      const loader = this.registry.get(moduleUrl);
      
      if (!loader) {
        console.warn(`[astro-auto-load] Loader not found for ${moduleUrl}`);
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
  }

  /**
   * Get all results (for debugging/inspection)
   */
  getResults(): Map<string, unknown> {
    return new Map(this.results);
  }
}

/**
 * Create a lazy loader executor for a request.
 * This doesn't execute any loaders until they're requested via getData().
 */
export function createLazyLoaderExecutor(
  options: RunAllLoadersOptions,
): LazyLoaderExecutor {
  const { params, request, extend } = options;
  const context = createLoaderContext({ params, request, extend });
  const registry = getRegistry();

  return new LazyLoaderExecutor(context, registry);
}

/**
 * Legacy function for backwards compatibility.
 * Immediately executes all loaders (not recommended for new code).
 */
export async function runAllLoadersForRequest(
  options: RunAllLoadersOptions,
): Promise<OrchestratorResult> {
  const { params, request, extend } = options;

  const context = createLoaderContext({ params, request, extend });
  const registry = getRegistry();

  const entries = Array.from(registry.entries());

  const results = await Promise.all(
    entries.map(async ([moduleUrl, loader]) => {
      const value = await loader(context);
      return [moduleUrl, value] as const;
    }),
  );

  const dataByModule = new Map<string, unknown>(results);

  return {
    context,
    dataByModule,
  };
}
