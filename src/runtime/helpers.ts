import type { AstroGlobal } from 'astro';

/**
 * Retrieve loaded data for the current component.
 *
 * The data is pre-loaded by middleware (which runs for both regular SSR and Server Islands).
 *
 * ```astro
 * ---
 * import { getLoaderData, type Loader } from 'astro-auto-load/runtime';
 *
 * type Data = Loader<typeof loader>; // shorthand use, or export for use elsewhere
 *
 * export const loader = async (context) => {
 *   return { title: 'Hello', count: 42 };
 * };
 *
 * // Call with no arguments - Vite plugin injects them automatically
 * const data = getLoaderData<Data>();
 * ---
 * ```
 *
 * @param astro - The Astro global object (optional - auto-injected by Vite plugin)
 * @param moduleUrl - The module URL (optional - auto-injected by Vite plugin)
 * @returns The loader data for this component, or undefined if not found
 */
export function getLoaderData<T = unknown>(astro?: any, moduleUrl?: string): T | undefined {
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

  return locals.autoLoad.get(moduleUrl) as T | undefined;
}
