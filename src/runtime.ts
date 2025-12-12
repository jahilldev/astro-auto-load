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

export { getLoaderData } from './runtime/helpers.js';
export { getRegistry } from './runtime/registry.js';
export { promiseDedupe } from './runtime/dedupe.js';
export { createLoaderContext } from './runtime/context.js';
export { runAllLoadersForRequest } from './runtime/orchestrator.js';
export type { LoaderContext, LoaderFn, Loader } from './runtime/types.js';
