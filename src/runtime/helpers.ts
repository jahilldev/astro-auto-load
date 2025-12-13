import type { Context } from './types.js';
import type { LazyLoaderExecutor } from './orchestrator.js';

/**
 * Define a loader function with automatic context typing.
 *
 * This is a convenience wrapper that provides TypeScript type inference
 * for the context parameter. It's completely optional - you can also
 * define loaders directly as async functions.
 *
 * ```astro
 * ---
 * import { defineLoader, getLoaderData } from 'astro-auto-load/runtime';
 *
 * export const loader = defineLoader(async (context) => {
 *   // context is automatically typed as Context ✨
 *   return { title: 'Hello', count: 42 };
 * });
 *
 * const data = await getLoaderData<typeof loader>();
 * ---
 * ```
 */
export function defineLoader<T>(
  fn: (context: Context) => Promise<T>
): (context: Context) => Promise<T> {
  return fn;
}

/**
 * Retrieve loaded data for the current component.
 *
 * All loaders execute in parallel automatically. The first call to any `getLoaderData()`
 * triggers execution of ALL registered loaders via Promise.all().
 *
 * ```astro
 * ---
 * import { getLoaderData } from 'astro-auto-load/runtime';
 *
 * export const loader = async (context) => {
 *   return { title: 'Hello', count: 42 };
 * };
 *
 * // Type inference works automatically ✨
 * const data = await getLoaderData<typeof loader>();
 * ---
 * <h1>{data?.title}</h1>
 * ```
 * 
 * @param astro - The Astro global object (auto-injected by Vite plugin)
 * @param moduleUrl - The module URL (auto-injected by Vite plugin)
 */
export function getLoaderData<TLoader extends (context: any) => Promise<any>>(
  astro?: any,
  moduleUrl?: string
): Promise<Awaited<ReturnType<TLoader>> | undefined> {
  const locals = astro?.locals;

  if (!locals?.autoLoad || !moduleUrl) {
    return Promise.resolve(undefined);
  }

  const executor = locals.autoLoad as LazyLoaderExecutor;

  return executor.getData(moduleUrl) as Promise<Awaited<ReturnType<TLoader>> | undefined>;
}
