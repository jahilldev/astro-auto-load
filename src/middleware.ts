import type { MiddlewareHandler } from 'astro';
import { initializeRequestRegistry } from './runtime/registry.js';
import { createLazyLoaderExecutor } from './runtime/orchestrator.js';

/**
 * Middleware that executes loaders for the current request in parallel.
 *
 * Strategy:
 * 1. Initialize a request-scoped registry (via AsyncLocalStorage)
 * 2. Components register their loaders as they're imported during rendering
 * 3. All registered loaders execute in parallel
 * 4. Middleware waits for all loaders to complete before rendering starts
 * 5. Components can then synchronously access their data (no await needed!)
 *
 * This is fully automatic - only components in the current route tree execute!
 *
 * Benefits:
 * - Only loaders for rendered components execute (no waste!)
 * - All needed loaders execute in parallel (no waterfalls)
 * - Synchronous data access in components (great DX!)
 * - Zero configuration needed
 * - Each loader runs exactly once per request
 *
 * This middleware is automatically injected by the integration.
 * You don't need to manually add it to src/middleware.ts.
 *
 * If you need to compose it with other middleware manually:
 * ```ts
 * import { autoLoadMiddleware } from 'astro-auto-load/middleware';
 * import { sequence } from 'astro:middleware';
 *
 * export const onRequest = sequence(autoLoadMiddleware, yourOtherMiddleware);
 * ```
 */
export const autoLoadMiddleware: MiddlewareHandler = async (context, next) => {
  const path = context.url.pathname;

  if (path.startsWith('/_astro') || path.startsWith('/assets') || path.startsWith('/api')) {
    return next();
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(context.params)) {
    if (value !== undefined) {
      params[key] = value;
    }
  }
  const request = context.request;

  // Initialize request-scoped registry and execute within that context
  return initializeRequestRegistry(async () => {
    // Create lazy executor - components will register as they're imported
    const executor = createLazyLoaderExecutor({
      params,
      request,
    });

    context.locals.autoLoad = executor;

    // Execute all loaders that get registered during this request
    // Components register as they're imported, then we execute them all in parallel
    executor.executeAll();

    // Wait for all loaders to complete before rendering starts
    // This allows components to synchronously access their data
    await executor.awaitAll();

    return next();
  });
};

export const onRequest = autoLoadMiddleware;
