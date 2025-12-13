/**
 * Runtime utilities for astro-auto-load components.
 *
 * Import from 'astro-auto-load/runtime' in your components:
 * ```astro
 * ---
 * import { getLoaderData, defineLoader } from 'astro-auto-load/runtime';
 * ---
 * ```
 */

// User-facing API - use these in your components
export { getLoaderData, defineLoader } from './runtime/helpers.js';
export type { Context, Loader } from './runtime/types.js';

// Internal APIs - exported for testing and advanced use cases
export { getRegistry, registerLoader } from './runtime/registry.js';
export { promiseDedupe } from './runtime/dedupe.js';
export { createLoaderContext } from './runtime/context.js';
export { createLazyLoaderExecutor } from './runtime/orchestrator.js';
