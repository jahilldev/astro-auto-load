import type { AstroGlobal } from 'astro';

/**
 * Helper to retrieve loader data for the current component.
 *
 * Usage in an Astro component:
 * ```astro
 * ---
 * import { getLoaderData } from 'astro-auto-load/runtime/helpers';
 *
 * export const load = async (ctx) => {
 *   return { title: 'Hello' };
 * };
 *
 * const data = getLoaderData<{ title: string }>(Astro, import.meta.url);
 * ---
 * <h1>{data.title}</h1>
 * ```
 *
 * @param astro - The Astro global object
 * @param moduleUrl - The module URL (use `import.meta.url`)
 * @returns The loader data for this component, or undefined if not found
 */
export function getLoaderData<T = unknown>(
  astro: AstroGlobal,
  moduleUrl: string,
): T | undefined {
  return astro.locals.autoLoad?.get(moduleUrl) as T | undefined;
}
