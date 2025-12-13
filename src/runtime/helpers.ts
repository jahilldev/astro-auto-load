import type { LazyLoaderExecutor } from './orchestrator.js';

/**
 * Retrieve loaded data for the current component.
 *
 * All loaders execute in parallel automatically. The first call to any `getLoaderData()`
 * triggers execution of ALL registered loaders via Promise.all().
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
 * // Type inference works automatically
 * const data = await getLoaderData<Data>();
 * ---
 * <h1>{data.title}</h1>
 * ```
 * 
 * @param astro - The Astro global object (auto-injected by Vite plugin)
 * @param moduleUrl - The module URL (auto-injected by Vite plugin)
 */
export function getLoaderData<T>(astro?: any, moduleUrl?: string): Promise<T | undefined> {
  const locals = astro?.locals;

  if (!locals?.autoLoad || !moduleUrl) {
    return Promise.resolve(undefined);
  }

  const executor = locals.autoLoad as LazyLoaderExecutor;

  return executor.getData(moduleUrl) as Promise<T | undefined>;
}
