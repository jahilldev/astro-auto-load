import 'astro';
import type { LoaderContext } from './runtime/types.js';

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

  /**
   * Declare the loader variable to enable automatic type inference.
   * This allows users to write:
   * ```ts
   * export const loader = async (context) => {
   *   // context is automatically typed as LoaderContext
   * };
   * ```
   */
  const loader: (context: LoaderContext) => Promise<any>;
}

export {};
