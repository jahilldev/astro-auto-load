import type { AstroGlobal } from 'astro';
import type { LazyLoaderExecutor } from './orchestrator.js';
import type { LoaderFn } from './types.js';
import { registerLoader } from './registry.js';

/**
 * Retrieve loaded data for the current component.
 *
 * Note: The Vite plugin auto-injects 'await' during transformation,
 * so the API appears synchronous to TypeScript but is async at runtime.
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
 * // Write without await - Vite plugin adds it automatically
 * const data = getLoaderData<Data>();
 * ---
 * <h1>{data.title}</h1>
 * ```
 *
 * @param astro - The Astro global object (optional - auto-injected by Vite plugin)
 * @param moduleUrl - The module URL (optional - auto-injected by Vite plugin)
 * @param loader - The loader function (optional - auto-injected by Vite plugin)
 * @returns The loader data for this component, or undefined if not found
 */
export function getLoaderData<T = unknown>(
  astro?: any,
  moduleUrl?: string,
  loader?: LoaderFn,
): T | undefined {
  if (!astro || !moduleUrl || !loader) {
    return undefined;
  }
  
  // Register the loader in the current request context
  registerLoader(moduleUrl, loader);

  if (!astro.createAstro) {
    return undefined;
  }

  const astroInstance = astro.createAstro({}, {}, {});
  const locals = astroInstance?.locals;

  if (!locals?.autoLoad) {
    return undefined;
  }

  const executor = locals.autoLoad as LazyLoaderExecutor;

  // Request data - batched with setImmediate to allow all imports to register first
  // TypeScript thinks this is sync, but runtime is async. Vite plugin adds await.
  const data = executor.getData(moduleUrl) as any;
  return data as T | undefined;
}
