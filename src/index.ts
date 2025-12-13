import type { AstroIntegration } from 'astro';
import { astroAutoLoadVitePlugin } from './vite-plugin.js';

/**
 * Astro integration for automatic component-level data loading.
 *
 * This integration:
 * 1. Detects components with `export const loader` functions
 * 2. Automatically registers them for parallel execution
 * 3. Injects middleware to run loaders before page render
 * 4. Provides data to components via `await getLoaderData()`
 *
 * Usage in astro.config.mjs:
 * ```js
 * import autoLoad from 'astro-auto-load';
 *
 * export default defineConfig({
 *   output: 'server',
 *   integrations: [autoLoad()],
 * });
 * ```
 *
 * That's it! No manual middleware setup required.
 */
export default function autoLoad(): AstroIntegration {
  return {
    name: 'astro-auto-load',
    hooks: {
      'astro:config:setup': ({ updateConfig, addMiddleware }) => {
        updateConfig({
          vite: {
            plugins: [astroAutoLoadVitePlugin()],
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

export { autoLoadMiddleware } from './middleware.js';
