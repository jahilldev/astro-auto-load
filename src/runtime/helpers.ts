import type { AstroGlobal } from 'astro';
import type { LazyLoaderExecutor } from './orchestrator.js';

/**
 * Retrieve loaded data for the current component.
 *
 * All loaders execute in parallel during middleware and complete before rendering starts.
 * This function synchronously returns the pre-loaded data.
 *
 * ```astro
 * ---
 * import { getLoaderData, type Loader } from 'astro-auto-load/runtime';
 *
 * type Data = Loader<typeof loader>;
 *
 * export const loader = async (context) => {
 *   return { title: 'Hello', count: 42 };
 * };
 *
 * // No await needed - data is already loaded!
 * const data = getLoaderData<Data>();
 * ---
 * <h1>{data.title}</h1>
 * ```
 *
 * @param astro - The Astro global object (optional - auto-injected by Vite plugin)
 * @param moduleUrl - The module URL (optional - auto-injected by Vite plugin)
 * @returns The loader data for this component, or undefined if not found
 */
export function getLoaderData<T = unknown>(
  astro?: any,
  moduleUrl?: string,
): T | undefined {
  if (!astro || !moduleUrl) {
    console.warn('[astro-auto-load] getLoaderData called without astro or moduleUrl', {
      astro: !!astro,
      moduleUrl,
    });
    return undefined;
  }

  if (!astro.createAstro) {
    return undefined;
  }

  const astroInstance = astro.createAstro({}, {}, {});
  const locals = astroInstance?.locals;

  if (!locals?.autoLoad) {
    return undefined;
  }

  const executor = locals.autoLoad as LazyLoaderExecutor;

  // Synchronously get the data - loaders have already completed in middleware
  const data = executor.getDataSync(moduleUrl);
  return data as T | undefined;
}
