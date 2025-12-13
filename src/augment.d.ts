import 'astro';
import type { LazyLoaderExecutor } from './runtime/orchestrator.js';

declare global {
  namespace App {
    interface Locals {
      /**
       * Lazy loader executor for component data loading.
       *
       * Loaders execute in parallel on the first call to `getLoaderData()`.
       * Results are cached for the remainder of the request.
       *
       * ```ts
       * import { getLoaderData } from 'astro-auto-load/runtime';
       * const data = await getLoaderData<typeof loader>();
       * ```
       */
      autoLoad?: LazyLoaderExecutor;
    }
  }
}

export {};
