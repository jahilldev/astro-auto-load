import type { MiddlewareHandler } from 'astro';
import { initializeRequestRegistry } from './runtime/registry.js';
import { createLoaderExecutor } from './runtime/orchestrator.js';

/**
 * Middleware that enables request-scoped loader execution.
 *
 * Strategy:
 * 1. Initialize a request-scoped registry (via AsyncLocalStorage)
 * 2. Components register their loaders as they're imported during rendering
 * 3. First getLoaderData() call executes ALL registered loaders in parallel
 * 4. Subsequent calls retrieve cached results
 *
 * This is fully automatic - only loaders for rendered components execute!
 *
 * Benefits:
 * - Only loaders for rendered components execute (no waste!)
 * - All needed loaders execute in parallel on first access (no waterfalls)
 * - Simple async data access with `await getLoaderData()` (great DX)
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
    const executor = createLoaderExecutor({
      params,
      request,
    });

    context.locals.autoLoad = executor;

    // Components register and request their data during rendering
    // All getData() calls are batched and executed in parallel automatically
    return next();
  });
};

export const onRequest = autoLoadMiddleware;
