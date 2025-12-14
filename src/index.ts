import type { AstroIntegration } from 'astro';
import { astroAutoLoadVitePlugin } from './vite-plugin.js';
import type { ViteDevServer } from 'vite';

/**
 * Discover all .astro components imported by a given module
 */
async function discoverComponentTree(
  server: ViteDevServer,
  moduleUrl: string,
  visited = new Set<string>(),
): Promise<string[]> {
  if (visited.has(moduleUrl)) return [];
  visited.add(moduleUrl);

  const components: string[] = [];

  try {
    const module = await server.moduleGraph.getModuleByUrl(moduleUrl);
    if (!module) return components;

    // If this is an .astro file, add it
    if (moduleUrl.endsWith('.astro')) {
      components.push(moduleUrl);
    }

    // Recursively traverse imports
    for (const imported of module.importedModules) {
      if (imported.url) {
        const children = await discoverComponentTree(server, imported.url, visited);
        components.push(...children);
      }
    }

    return components;
  } catch (error) {
    // Module not found or can't be analyzed
    return components;
  }
}

/**
 * Astro integration for automatic component-level data loading.
 *
 * This integration:
 * 1. Detects components with `export const loader` functions
 * 2. Automatically registers them for parallel execution
 * 3. Pre-discovers entire component tree via module graph (DEV MODE)
 * 4. Eagerly loads all components before rendering starts
 * 5. Injects middleware to run loaders before page render
 * 6. Provides data to components via `await getLoaderData()`
 *
 * PARALLEL EXECUTION STRATEGY:
 * - In development: Uses Vite's module graph to discover entire tree
 * - Pre-loads all .astro modules before rendering (triggers registration)
 * - All loaders execute in single parallel batch
 * - Works for both sibling AND nested components! 🚀
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

      'astro:server:setup': async ({ server }) => {
        // Intercept SSR requests to pre-discover and load components
        server.middlewares.use(async (req, res, next) => {
          // Only process Astro page requests
          if (!req.url || req.url.startsWith('/@') || req.url.includes('.')) {
            return next();
          }

          try {
            // Find the page module for this route
            const pageUrl = req.url === '/' ? '/index' : req.url;
            const possiblePaths = [
              `/src/pages${pageUrl}.astro`,
              `/src/pages${pageUrl}/index.astro`,
            ];

            let pageModule: string | null = null;
            for (const path of possiblePaths) {
              const module = await server.moduleGraph.getModuleByUrl(path);
              if (module) {
                pageModule = path;
                break;
              }
            }

            if (pageModule) {
              console.log(`[astro-auto-load] Pre-discovering components for ${req.url}`);

              // Discover entire component tree using module graph
              const allComponents = await discoverComponentTree(server, pageModule);

              console.log(`[astro-auto-load] Found ${allComponents.length} components in tree`);

              // Eagerly load all component modules (triggers their loader registration)
              await Promise.all(
                allComponents.map(async (componentUrl) => {
                  try {
                    // Use ssrLoadModule to load in SSR context
                    await server.ssrLoadModule(componentUrl);
                  } catch (error) {
                    // Component might not have a loader or might have errors
                    // This is fine - continue with others
                  }
                })
              );

              console.log(`[astro-auto-load] Pre-loaded all components - loaders ready for parallel execution`);
            }
          } catch (error) {
            // Don't break the request if discovery fails
            console.warn('[astro-auto-load] Component discovery failed:', error);
          }

          next();
        });
      },
    },
  };
}

export { autoLoadMiddleware } from './middleware.js';
