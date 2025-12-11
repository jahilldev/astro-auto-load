import type { AstroIntegration } from 'astro';
import { astroAutoLoadVitePlugin } from './vite-plugin';

export type AutoLoadOptions = {};

/**
 * Astro integration for automatic component-level data loading.
 *
 * This integration:
 * 1. Detects components with `export const loader` functions
 * 2. Automatically registers them for parallel execution
 * 3. Injects middleware to run loaders before page render
 * 4. Provides data to components via Astro.locals
 *
 * Usage in astro.config.mjs:
 * ```js
 * import autoLoad from 'astro-auto-load';
 *
 * export default defineConfig({
 *   output: 'server', // or 'hybrid'
 *   integrations: [autoLoad()],
 * });
 * ```
 *
 * That's it! No manual middleware setup required.
 */
export default function autoLoad(options: AutoLoadOptions = {}): AstroIntegration {
  return {
    name: 'astro-auto-load',
    hooks: {
      'astro:config:setup': ({ updateConfig, config, addMiddleware }) => {
        updateConfig({
          vite: {
            plugins: [
              astroAutoLoadVitePlugin({
                root: config.root?.pathname ?? process.cwd(),
              }),
            ],
          },
        });

        addMiddleware({
          entrypoint: 'astro-auto-load/middleware',
          order: 'pre',
        });
      },
    },
  };
}

export { autoLoadMiddleware } from './middleware';
export { getData } from './runtime/helpers';
export type { LoaderContext, LoaderFn, Loader } from './runtime/types';
