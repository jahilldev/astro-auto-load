import type { AstroGlobal } from 'astro';

/**
 * Retrieve loaded data for the current component.
 *
 * The data is pre-loaded by middleware (which runs for both regular SSR and Server Islands).
 *
 * ```astro
 * ---
 * import { getData, type Loader } from 'astro-auto-load/runtime';
 *
 * export const loader = async (ctx) => {
 *   return { title: 'Hello', count: 42 };
 * };
 *
 * // Call with no arguments - Vite plugin injects them automatically
 * const data = getData<Loader<typeof loader>>();
 * ---
 * ```
 *
 * @param astro - The Astro global object (optional - auto-injected by Vite plugin)
 * @param moduleUrl - The module URL (optional - auto-injected by Vite plugin)
 * @returns The loader data for this component, or undefined if not found
 */
export function getData<T = unknown>(astro?: AstroGlobal, moduleUrl?: string): T | undefined {
  if (!astro || !moduleUrl) {
    return undefined;
  }

  return astro.locals.autoLoad?.get(moduleUrl) as T | undefined;
}
