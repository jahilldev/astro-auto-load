import 'astro';

declare global {
  namespace App {
    interface Locals {
      /**
       * Map of module URLs to their loader results.
       *
       * Components can access their data using:
       * ```ts
       * const data = Astro.locals.autoLoad?.get(import.meta.url);
       * ```
       */
      autoLoad?: Map<string, unknown>;
    }
  }
}

export {};
