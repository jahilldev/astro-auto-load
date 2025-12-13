import 'astro';
import type { LazyLoaderExecutor } from './runtime/orchestrator.js';

declare global {
  namespace App {
    interface Locals {
      /**
       * Lazy loader executor that runs loaders on-demand.
       *
       * Components automatically access their data using getLoaderData():
       * ```ts
       * import { getLoaderData } from 'astro-auto-load/runtime';
       * const data = await getLoaderData<MyDataType>();
       * ```
       *
       * Advanced usage (direct access):
       * ```ts
       * const data = await Astro.locals.autoLoad?.getData(import.meta.url);
       * ```
       */
      autoLoad?: LazyLoaderExecutor;
    }
  }
}

export {};
