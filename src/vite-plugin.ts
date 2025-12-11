import type { Plugin } from 'vite';

interface PluginOptions {
  root: string;
}

/**
 * Vite plugin that detects components with `export const loader` and
 * automatically registers them in the loader registry.
 */
export function astroAutoLoadVitePlugin(options: PluginOptions): Plugin {
  return {
    name: 'astro-auto-load-vite-plugin',
    enforce: 'pre',

    async transform(code, id) {
      if (!id.endsWith('.astro')) return null;

      // Check for 'export const loader' or 'export async function loader' in frontmatter
      // We use regex since the AST parser doesn't expose export info directly
      const hasLoaderExport = /export\s+(const|async\s+function)\s+loader\s*[=(]/m.test(code);

      if (!hasLoaderExport) return null;

      // More robust frontmatter injection
      const frontmatterMatch = code.match(/^---\s*\n/);

      if (frontmatterMatch) {
        // Component has frontmatter - inject after opening ---
        const injected = code.replace(
          /^---\s*\n/,
          `---\nimport { registerLoader } from "astro-auto-load/runtime/registry";\nregisterLoader(import.meta.url, loader);\n`,
        );
        return { code: injected, map: null };
      } else {
        // No frontmatter - add it
        const injected = `---\nimport { registerLoader } from "astro-auto-load/runtime/registry";\nregisterLoader(import.meta.url, loader);\n---\n${code}`;
        return { code: injected, map: null };
      }
    },
  };
}
