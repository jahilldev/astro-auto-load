import type { AstroGlobal } from 'astro';

/**
 * Retrieve loaded data for the current component.
 *
 * Usage in an Astro component:
 * ```astro
 * ---
 * import { getData, type Loader } from 'astro-auto-load/runtime';
 *
 * export const loader = async (ctx) => {
 *   return { title: 'Hello', count: 42 };
 * };
 *
 * // Type is automatically inferred from the loader
 * type Data = Loader<typeof loader>; // { title: string, count: number }
 * const data = getData<Data>(Astro, import.meta.url);
 * // data.title is string, data.count is number
 * ---
 * <h1>{data.title}</h1>
 * ```
 *
 * @param astro - The Astro global object
 * @param moduleUrl - The module URL (use `import.meta.url`)
 * @returns The loader data for this component, or undefined if not found
 */
export function getData<T = unknown>(astro: AstroGlobal, moduleUrl: string): T | undefined {
  return astro.locals.autoLoad?.get(moduleUrl) as T | undefined;
}
