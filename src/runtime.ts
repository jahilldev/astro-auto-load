/**
 * Runtime utilities for astro-auto-load components.
 *
 * Import from 'astro-auto-load/runtime' in your components:
 * ```astro
 * ---
 * import { getData, type Loader } from 'astro-auto-load/runtime';
 * ---
 * ```
 */

export { getData } from './runtime/helpers';
export type { LoaderContext, LoaderFn, Loader } from './runtime/types';
