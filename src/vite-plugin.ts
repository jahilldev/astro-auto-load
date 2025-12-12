import type { Plugin } from 'vite';

interface PluginOptions {
  root: string;
}

const injectedCode = `
import { registerLoader as __autoLoadRegister } from "astro-auto-load/runtime";
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

      // Find where the loader is defined and inject the registration call after it
      const loaderMatch = transformed.match(
        /((?:const|let|var)\s+loader\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n\};?)/,
      );

      if (loaderMatch && loaderMatch.index !== undefined) {
        const position = loaderMatch.index + loaderMatch[0].length;

        transformed = `
          ${transformed.slice(0, position)}
          __autoLoadRegister(import.meta.url, loader);
          ${transformed.slice(position)}
        `;
      }

      transformed = transformed.replace(
        /getLoaderData\s*<([^>]+)>\s*\(\s*\)/g,
        'getLoaderData<$1>($$$$result, __autoLoadModuleUrl)',
      );

      transformed = transformed.replace(
        /getLoaderData\s*\(\s*\)/g,
        'getLoaderData($$$$result, __autoLoadModuleUrl)',
      );

      return { code: transformed, map: null };
    },
  };
}
