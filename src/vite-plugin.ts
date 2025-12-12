import type { Plugin } from 'vite';

interface PluginOptions {
  root: string;
}

/**
 * Vite plugin that detects components with `export const loader` or `export async function loader`
 * and automatically:
 * 1. Registers them for middleware discovery
 * 2. Transforms getData() calls to pass Astro and import.meta.url automatically
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

      const injectedCode = `
import { registerLoader } from "astro-auto-load/runtime/registry";

// Register loader for middleware discovery
registerLoader(import.meta.url, loader);
`;

      let transformed = code;

      // Inject registration
      const frontmatterMatch = transformed.match(/^---\s*\n/);
      if (frontmatterMatch) {
        transformed = transformed.replace(/^---\s*\n/, `---\n${injectedCode}\n`);
      } else {
        transformed = `---\n${injectedCode}\n---\n${transformed}`;
      }

      // Replace getData() calls with getData(Astro, import.meta.url)
      transformed = transformed.replace(
        /getData\s*<([^>]+)>\s*\(\s*\)/g,
        'getData<$1>(Astro, import.meta.url)',
      );

      transformed = transformed.replace(
        /getData\s*\(\s*\)/g,
        'getData(Astro, import.meta.url)',
      );

      return { code: transformed, map: null };
    },
  };
}
