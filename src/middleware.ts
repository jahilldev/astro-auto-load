import type { MiddlewareHandler } from 'astro';
import { runAllLoadersForRequest } from './runtime/orchestrator';

/**
 * Middleware that runs all registered loaders before rendering the page.
 *
 * This executes all loader functions in parallel, then stores the results
 * in context.locals.autoLoad for components to access.
 *
 * This middleware is automatically injected by the integration.
 * You don't need to manually add it to src/middleware.ts.
 *
 * If you need to compose it with other middleware manually:
 * ```ts
 * import { autoLoadMiddleware } from 'astro-auto-load/middleware';
 * import { sequence } from 'astro:middleware';
 *
 * export const onRequest = sequence(autoLoadMiddleware(), yourOtherMiddleware);
 * ```
 */
export function autoLoadMiddleware(): MiddlewareHandler {
  return async (context, next) => {
    // Skip assets and API routes
    const path = context.url.pathname;
    if (path.startsWith('/_astro') || path.startsWith('/assets') || path.startsWith('/api')) {
      return next();
    }

    // Filter out undefined values from params
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(context.params)) {
      if (value !== undefined) {
        params[key] = value;
      }
    }
    const request = context.request;

    const { dataByModule } = await runAllLoadersForRequest({
      params,
      request,
    });

    // Store the map directly so components can look themselves up
    context.locals.autoLoad = dataByModule;

    return next();
  };
}

// Export the default middleware for Astro's automatic injection
export const onRequest = autoLoadMiddleware();
