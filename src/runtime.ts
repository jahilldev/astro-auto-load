/**
 * Runtime utilities for astro-auto-load components.
 *
 * Import from 'astro-auto-load/runtime' in your components:
 * ```astro
 * ---
 * import { getLoaderData, type Loader } from 'astro-auto-load/runtime';
 * ---
 * ```
 */

export { getLoaderData } from './runtime/helpers';
export type { LoaderContext, LoaderFn, Loader } from './runtime/types';
