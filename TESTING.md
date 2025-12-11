# Testing Guide

## Manual Testing Checklist

When you install this plugin in a real Astro project, test the following:

### Basic Functionality

- [ ] Plugin installs without errors: `npm install astro-auto-load`
- [ ] Integration can be added to `astro.config.mjs`
- [ ] Middleware is automatically injected (no manual setup needed)
- [ ] Dev server starts without errors
- [ ] Build completes without errors

### Loader Detection

- [ ] Component with `export const loader = async (ctx) => { ... }` is detected
- [ ] Component with `export async function load(ctx) { ... }` is detected
- [ ] Component without a loader is not affected
- [ ] Multiple components with loaders all work on the same page

### Data Loading

- [ ] Loader function receives correct `ctx.params` from route
- [ ] Loader function receives correct `ctx.url`
- [ ] Loader function receives correct `ctx.request`
- [ ] Data returned from loader is accessible via `getData()`
- [ ] Multiple loaders run in parallel (check Network tab timing)

### Deduplication

- [ ] Multiple components calling same loader function only make one request
- [ ] Using `ctx.dedupe()` prevents duplicate calls with same arguments
- [ ] Different arguments to dedupe result in separate calls

### TypeScript

- [ ] `LoaderContext` type is available for import
- [ ] `getData<T>()` provides correct typing
- [ ] `Astro.locals.autoLoad` is properly typed
- [ ] No TypeScript errors in IDE after setup

### Edge Cases

- [ ] Page with no loaders renders correctly
- [ ] Loader that throws error doesn't crash the app
- [ ] Loader returning `null` or `undefined` works
- [ ] Component without frontmatter gets frontmatter added
- [ ] Component with existing frontmatter gets imports injected correctly
- [ ] Routes starting with `/_astro`, `/assets`, `/api` skip middleware

### Performance

- [ ] Page with 5+ loaders renders faster than sequential loading
- [ ] Dedupe reduces total number of network requests
- [ ] No duplicate registrations in development (HMR)

## Setting Up a Test Project

```bash
# Create a new Astro project
npm create astro@latest test-auto-load
cd test-auto-load

# Install your local version
npm install /path/to/astro-auto-load

# Or link it
cd /path/to/astro-auto-load
npm link
cd /path/to/test-auto-load
npm link astro-auto-load

# Follow the setup in QUICKSTART.md
```

## Example Test Component

```astro
---
// src/components/TestLoader.astro
import { getData } from 'astro-auto-load/runtime/helpers';
import type { LoaderContext } from 'astro-auto-load';

export const loader = async (ctx: LoaderContext) => {
  console.log('Loader running for:', ctx.url.pathname);
  console.log('Params:', ctx.params);

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    message: 'Hello from loader!',
    timestamp: new Date().toISOString(),
    params: ctx.params,
  };
};

const data = getData<{
  message: string;
  timestamp: string;
  params: Record<string, string>;
}>(Astro, import.meta.url);

console.log('Component rendering with data:', data);
---

<div class="test">
  {data ? (
    <>
      <p>{data.message}</p>
      <p>Loaded at: {data.timestamp}</p>
      <pre>{JSON.stringify(data.params, null, 2)}</pre>
    </>
  ) : (
    <p>No data loaded</p>
  )}
</div>
```

## Debugging Tips

### Check if loader is registered

Add console.log to your loader:

```ts
export const loader = async (ctx: LoaderContext) => {
  console.log('LOADER CALLED:', import.meta.url);
  // ... rest of loader
};
```

### Check if middleware runs

The middleware is automatically injected. To verify it's running, temporarily modify your local copy:

```ts
// In node_modules/astro-auto-load/dist/runtime/middleware.js, add:
export function autoLoadMiddleware() {
  return async (context, next) => {
    console.log('✓ Auto-load middleware running:', context.url.pathname);
    // ... rest of the function
  };
}
```

Or create a custom middleware to compose:

```ts
// In src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

const debugMiddleware = defineMiddleware(async (context, next) => {
  console.log('Request:', context.url.pathname);
  return next();
});

export const onRequest = sequence(debugMiddleware, autoLoadMiddleware());
```

### Check transformed code

In dev mode, the Vite plugin transforms your `.astro` files. Check the browser's Sources tab to see the transformed code and verify the `registerLoader` call was injected.

### Check registry

Add a temporary endpoint to inspect the registry:

```ts
// src/pages/api/debug.ts
import { getRegistry } from 'astro-auto-load/runtime/registry';

export function GET() {
  const registry = getRegistry();
  return new Response(
    JSON.stringify({
      loaderCount: registry.size,
      loaders: Array.from(registry.keys()),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

## Common Issues

### "Cannot find module 'astro-auto-load/middleware'"

- Run `npm run build` in the plugin directory
- Check that `dist/runtime/middleware.js` exists
- Verify `package.json` exports are correct

### Loader not running

- Check `output` is set to `server` or `hybrid` in astro.config
- Verify integration is added: `integrations: [autoLoad()]`
- Look for errors in console
- Confirm `export const loader` syntax is correct
- Check if you have a custom `src/middleware.ts` that might be overriding the auto-injected one

### Data is undefined

- Check that `import.meta.url` is passed to `getData()`
- Verify loader is returning data
- Check Network tab for failed requests
- Ensure loader is registered (check console logs)

### TypeScript errors

- Add `/// <reference types="astro-auto-load/augment" />` to env.d.ts
- Restart TypeScript server in IDE
- Run `npm run build` to generate type definitions
