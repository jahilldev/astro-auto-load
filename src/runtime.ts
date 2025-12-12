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
export { getRegistry } from './runtime/registry';
export { promiseDedupe } from './runtime/dedupe';
export { createLoaderContext } from './runtime/context';
export { runAllLoadersForRequest } from './runtime/orchestrator';
export type { LoaderContext, LoaderFn, Loader } from './runtime/types';
