import type { Plugin } from 'vite';

interface PluginOptions {
  root: string;
}

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

    async load(id) {
      if (!id.endsWith('.astro')) return null;
      
      const fs = await import('fs/promises');
      const code = await fs.readFile(id.split('?')[0], 'utf-8');
      
      // Check for 'export const loader' or 'export async function loader' in frontmatter
      const hasLoaderExport = /export\s+(const|async\s+function)\s+loader\s*[=(]/m.test(code);

      if (!hasLoaderExport) return null;

      let transformed = code;

      // Find and extract the frontmatter
      const frontmatterMatch = transformed.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const originalFrontmatter = frontmatterMatch[1];
        const injectedImports = `import { registerLoader as __autoLoadRegister } from "astro-auto-load/runtime";\n`;
        
        // Merge: injected imports + original frontmatter
        const mergedFrontmatter = `---\n${injectedImports}${originalFrontmatter}\n---`;
        
        // Replace the original frontmatter with merged version
        transformed = transformed.replace(/^---\n[\s\S]*?\n---/, mergedFrontmatter);
      }

      // Inject loader registration immediately after loader definition
      // Use import.meta.url directly, not as a variable
      // Match the entire loader definition including function body
      transformed = transformed.replace(
        /(export\s+const\s+loader\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n\};?)/,
        '$1\n__autoLoadRegister(import.meta.url, loader);'
      );

      // Transform getLoaderData() calls to inject Astro and moduleUrl parameters
      // Use import.meta.url directly in the call
      transformed = transformed.replace(
        /(await\s+)?getLoaderData<([^>]+)>\(\)/g,
        '$1getLoaderData<$2>(Astro, import.meta.url)'
      );

      return { code: transformed, map: null };
    },
  };
}
