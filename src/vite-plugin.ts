import type { Plugin } from 'vite';

/**
 * Vite plugin that transforms .astro files with loaders to enable parallel execution,
 * even with nested components.
 *
 * Strategy:
 * 1. Transform the ORIGINAL .astro source before Astro compiles it
 * 2. Remove blocking `await getLoaderData()` from frontmatter
 * 3. Transform template to access data from Astro.locals.autoLoad
 * 4. Register loaders automatically
 *
 * This allows child components to register before parent data is fetched!
 */
export function astroAutoLoadVitePlugin(): Plugin {
  return {
    name: 'astro-auto-load-vite-plugin',
    enforce: 'pre', // Run BEFORE Astro's compiler

    async load(id) {
      if (!id.endsWith('.astro')) return null;
      
      const fs = await import('fs/promises');
      const code = await fs.readFile(id.split('?')[0], 'utf-8');
      
      // Check for 'export const loader' in frontmatter
      const hasLoaderExport = /export\s+(const|async\s+function)\s+loader\s*[=(]/m.test(code);

      if (!hasLoaderExport) return null;

      // Parse the .astro file structure
      const frontmatterMatch = code.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontmatterMatch) return null;

      let frontmatter = frontmatterMatch[1];
      let template = frontmatterMatch[2];

      const componentName = id.split('/').pop();
      const isParallel = componentName?.includes('Parallel');

      // Step 1: Add registerLoader import if not present
      if (!frontmatter.includes('registerLoader')) {
        // Check if there's already an import from astro-auto-load/runtime
        const runtimeImportMatch = frontmatter.match(/import\s+\{([^}]+)\}\s+from\s+['"]astro-auto-load\/runtime['"]/);
        
        if (runtimeImportMatch) {
          // Add registerLoader to existing import
          const imports = runtimeImportMatch[1];
          frontmatter = frontmatter.replace(
            /import\s+\{([^}]+)\}\s+from\s+['"]astro-auto-load\/runtime['"]/,
            `import { ${imports.trim()}, registerLoader } from 'astro-auto-load/runtime'`
          );
        } else {
          // Add new import at the top
          frontmatter = `import { registerLoader } from 'astro-auto-load/runtime';\n${frontmatter}`;
        }
      }

      // Step 2: Inject loader registration after loader definition
      frontmatter = frontmatter.replace(
        /(export\s+const\s+loader\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n\};?)/,
        '$1\nregisterLoader(import.meta.url, loader);'
      );

      // Step 3: CRITICAL - Remove blocking await from frontmatter
      // Match: const data = await getLoaderData<typeof loader>();
      // This is what blocks child components from registering!
      const dataVarMatch = frontmatter.match(/const\s+(\w+)\s*=\s*await\s+getLoaderData<typeof\s+loader>\(\);?/);
      
      if (dataVarMatch) {
        const dataVarName = dataVarMatch[1]; // e.g., "data"
        
        // Remove the blocking await line (handle with or without trailing newline)
        frontmatter = frontmatter.replace(
          /const\s+\w+\s*=\s*await\s+getLoaderData<typeof\s+loader>\(\);?(\s*\n)?/,
          '// Data access deferred to template for non-blocking parallel execution\n'
        );

        // Step 4: Transform template to access data from Astro.locals
        // Replace all occurrences of {data.prop} or data-attr={data.prop}
        // with direct calls to Astro.locals.autoLoad
        const dataAccessRegex = new RegExp(`\\b${dataVarName}\\.(\\w+)\\b`, 'g');
        template = template.replace(
          dataAccessRegex,
          (match, prop) => `(await Astro.locals.autoLoad.getData(import.meta.url)).${prop}`
        );
      }

      // Reconstruct the .astro file
      const transformed = `---\n${frontmatter}\n---\n${template}`;

      return { code: transformed, map: null };
    },
  };
}
