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
   * All getData() calls in the same tick are batched together.
   */
  async getData(moduleUrl: string): Promise<unknown> {
    // Add to the batch
    this.requestedLoaders.add(moduleUrl);

    // Schedule batch execution if not already scheduled
    if (!this.isBatchScheduled) {
      this.isBatchScheduled = true;
      // Use setImmediate to allow all synchronous component imports to complete
      this.batchPromise = new Promise(resolve => setImmediate(resolve)).then(() => this.executeBatch());
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
   * Execute all registered loaders in parallel.
   * Executes ALL loaders in the registry, not just requested ones.
   * This ensures nested components that registered after first getData() call still execute.
   */
  private async executeBatch(): Promise<void> {
    // Execute ALL registered loaders
    const loadersToExecute = Array.from(this.registry.entries());

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
