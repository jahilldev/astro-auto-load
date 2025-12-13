import 'astro';
import type { LazyLoaderExecutor } from './runtime/orchestrator.js';

declare global {
  namespace App {
    interface Locals {
      /**
       * Lazy loader executor containing pre-loaded data.
       *
       * All loaders execute in parallel during middleware before rendering starts.
       * Components access their data synchronously using getLoaderData():
       * ```ts
       * import { getLoaderData } from 'astro-auto-load/runtime';
       * const data = getLoaderData<MyDataType>(); // No await!
       * ```
       */
      autoLoad?: LazyLoaderExecutor;
    }
  }
}

export {};
