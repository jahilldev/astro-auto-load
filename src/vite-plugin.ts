import type { Plugin } from 'vite';

interface PluginOptions {
  root: string;
}

const injectedCode = `
const __autoLoadModuleUrl = import.meta.url;
`;

/**
 * Vite plugin that detects components with `export const loader` or `export async function loader`
 * and automatically:
 * 1. Registers them for middleware discovery
 * 2. Transforms getLoaderData() calls to pass the correct parameters
 *
 * This enables both regular SSR and Server Islands to work seamlessly,
 * as Astro runs middleware for both contexts.
 */
export function astroAutoLoadVitePlugin(options: PluginOptions): Plugin {
  return {
    name: 'astro-auto-load-vite-plugin',
    enforce: 'pre',

    async transform(code, id) {
      if (!id.endsWith('.astro')) return null;

      // Check for 'export const loader' or 'export async function loader' in frontmatter
      const hasLoaderExport = /export\s+(const|async\s+function)\s+loader\s*[=(]/m.test(code);

      if (!hasLoaderExport) return null;

      let transformed = code;

      // Inject imports and module URL capture at the very top
      transformed = injectedCode + transformed;

      // Auto-inject await for getLoaderData calls and pass the loader function
      // This allows users to write sync-looking code that's actually async
      transformed = transformed.replace(
        /(const|let|var)\s+(\w+)\s*=\s*getLoaderData\s*<([^>]+)>\s*\(\s*\)/g,
        '$1 $2 = await getLoaderData<$3>($$$$result, __autoLoadModuleUrl, loader)',
      );

      transformed = transformed.replace(
        /(const|let|var)\s+(\w+)\s*=\s*getLoaderData\s*\(\s*\)/g,
        '$1 $2 = await getLoaderData($$$$result, __autoLoadModuleUrl, loader)',
      );

      return { code: transformed, map: null };
    },
  };
}
