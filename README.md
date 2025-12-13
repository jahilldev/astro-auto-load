# astro-auto-load

Automatic component-level data loading for Astro SSR. Co-locate your data fetching logic with your components while eliminating waterfalls and duplicate requests.

## The Problem

In typical Astro SSR apps, you face a choice:

1. **Props drilling** - Pass data from page to deeply nested components (verbose and brittle, and couples component trees). Not fun for complex apps.
2. **Fetch in components** - Nice DX, but Astro resolves promises sequentially (async waterfall), hurting render times and TTFB.

## The Solution

`astro-auto-load` lets you define `loader` functions directly in your components. The integration:

✅ **Collects all loaders** before rendering  
✅ **Runs them in parallel** (no waterfalls)  
✅ **Deduplicates promises** via utility function  
✅ **Provides type-safe data** to your components

### Performance Impact

**Before** (Traditional Async Components):

```
Component Tree: Parent → Child → Grandchild
Each component: ~100ms data fetch
Total fetch time: ~300ms (sequential waterfall)
```

**After** (With astro-auto-load):

```
Component Tree: Parent → Child → Grandchild
Each component: ~100ms data fetch
Total fetch time: ~100ms (parallel execution)
```

**Result:** ~3x faster rendering, verified by [E2E tests](test/e2e.test.ts) ⚡

## Installation

```bash
npm install astro-auto-load
```

## Setup

### 1. Add the integration

In `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import autoLoad from 'astro-auto-load';

export default defineConfig({
  output: 'server', // required
  integrations: [autoLoad()],
});
```

**That's it!** The middleware is automatically injected and loaders run in parallel.

### 2. Add TypeScript support (recommended)

Create `src/env.d.ts` if it doesn't exist:

```ts
/// <reference types="astro/client" />
/// <reference types="astro-auto-load/augment" />
```

This ensures `Astro.locals.autoLoad` is properly typed.

## Usage

### Basic Example

Define a loader in your component:

```astro
---
// src/components/Post.astro
import { getLoaderData } from 'astro-auto-load/runtime';

export const loader = async (context) => {
  const res = await fetch(`https://api.example.com/posts/${context.params.id}`);
  return res.json();
};

const data = await getLoaderData();
---

<article>
  <h2>{data.title}</h2>
  <p>{data.body}</p>
</article>
```

Or with TypeScript:

```astro
---
// src/components/Post.astro
import { type Context, getLoaderData } from 'astro-auto-load/runtime';

export const loader = async (context: Context) => {
  const res = await fetch(`https://api.example.com/posts/${context.params.id}`);
  return res.json();
};

// Type inference works automatically! ✨
const data = await getLoaderData<typeof loader>();
---

<article>
  <h2>{data.title}</h2>
  <p>{data.body}</p>
</article>
```

### Alternative: Using `defineLoader` for Context Types

If you prefer implicit context typing, use `defineLoader`:

```astro
---
// src/components/Post.astro
import { defineLoader, getLoaderData } from 'astro-auto-load/runtime';

export const loader = defineLoader(async (context) => {
  // context is automatically typed as Context ✨
  const res = await fetch(`https://api.example.com/posts/${context.params.id}`);
  return res.json();
});

// Type inference works automatically! ✨
const data = await getLoaderData<typeof loader>();
---

<article>
  <h2>{data.title}</h2>
  <p>{data.body}</p>
</article>
```

### Using Route Parameters

Loaders automatically receive route parameters through the `context` object:

```astro
---
// src/pages/posts/[id].astro
import Post from '../../components/Post.astro';
---

<Post />
```

When you visit `/posts/123`, the `Post` component's loader receives `context.params.id === "123"` automatically.

### Deduplication

If multiple components request the same data, use the built-in dedupe helper:

```astro
---
export const loader = async (context) => {
  // Dedupe by unique key - only executes once per unique key per request
  return context.dedupe(
    `story-${context.params.id}`,
    async () => {
      const res = await fetch(`https://api.example.com/stories/${context.params.id}`);
      return res.json();
    }
  );
};
---
```

## How It Works

The integration uses lazy execution to run loaders efficiently:

1. **Build-time**: The Vite plugin transforms `.astro` files to automatically inject loader registration code
2. **Runtime**: Middleware sets up `AsyncLocalStorage` to track loaders during each request
3. **Runtime**: Components with loaders register themselves when imported during rendering
4. **Runtime**: The first call to `getLoaderData()` triggers parallel execution of all registered loaders
5. **Runtime**: Results are cached in `Astro.locals.autoLoad` for the remainder of the request
6. **Runtime**: Components retrieve their data using `await getLoaderData()`

**Benefits:**

- Only executes loaders for components that are actually rendered
- All loaders execute in parallel (no async waterfalls!)
- Type-safe data access with inference via `getLoaderData<typeof loader>();`

## API Reference

### `Context`

The context object passed to every loader function:

```ts
interface Context {
  /** Route parameters (e.g., { id: "123" } for /posts/[id]) */
  params: Record<string, string>;

  /** Full URL object */
  url: URL;

  /** Original Request object */
  request: Request;

  /** Dedupe helper to prevent duplicate async calls */
  dedupe: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
}
```

### `getLoaderData<T>()`

Retrieves the loaded data for the current component. Must be called with `await` as loaders execute asynchronously.

```ts
const data = await getLoaderData<Data>();
```

### `autoLoadMiddleware`

The middleware handler that sets up the loader execution context. Automatically injected unless you have a custom `src/middleware.ts` file.

## Advanced Usage

### Custom Middleware Composition

**Important:** The integration automatically injects middleware **only if you don't have a `src/middleware.ts` file**.

#### If you have existing middleware:

If you already have a `src/middleware.ts` file with `export const onRequest`, you **must** manually include `autoLoadMiddleware`:

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

const myMiddleware = defineMiddleware(async (context, next) => {
  // Your custom logic
  console.log('Request:', context.url.pathname);
  return next();
});

// IMPORTANT: Include autoLoadMiddleware in your sequence!
export const onRequest = sequence(myMiddleware, autoLoadMiddleware);
```

#### If you don't have middleware:

The integration automatically injects it for you - no `src/middleware.ts` needed! ✨

**Why?** Astro uses **either** your manual `src/middleware.ts` export **or** integration-injected middleware, but not both. If you export `onRequest` yourself, you take full control and must include `autoLoadMiddleware` in your chain.

### Skipping Routes

By default, the middleware runs on all routes. To skip specific paths, create a wrapper middleware:

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

const conditionalAutoLoad = defineMiddleware(async (context, next) => {
  // Skip admin routes
  if (context.url.pathname.startsWith('/admin')) {
    return next();
  }

  // Otherwise, run autoLoadMiddleware
  return autoLoadMiddleware(context, next);
});

export const onRequest = conditionalAutoLoad;
```

## TypeScript

The package includes full TypeScript support with automatic type inference.

### Automatic Type Inference (Recommended)

Simply pass `typeof loader` to `getLoaderData`:

```astro
---
import { getLoaderData } from 'astro-auto-load/runtime';

export const loader = async (context) => {
  return {
    name: 'Hugo',
    age: 42,
    hobbies: ['coding', 'cats']
  };
};

const data = await getLoaderData<typeof loader>();
// data is { name: string; age: number; hobbies: string[] }
---
```

### Extracting Types for Reuse

If you need the type elsewhere, extract it using the `Loader` helper:

```astro
---
// src/components/ParentComponent.astro
import { type Loader, getLoaderData } from 'astro-auto-load/runtime';
import { ChildComponent } from './ChildComponent.astro';

export const loader = async () => ({ count: 42 });

export type Data = Loader<typeof loader>; // { count: number }

const data = await getLoaderData<Data>();
---

<ChildComponent data={data} />
```

```astro
---
// src/components/ChildComponent.astro
import type { Data } from './ParentComponent.astro'

type Props {
  data: Data;
}

const { data } = Astro.props;
---

<div>{data.count}</div>
```

## Limitations

- **Only works in SSR mode** (not static builds)
- **Loaders run on-demand** - Results are cached per request, but there's no persistent caching across requests
- **Loaders cannot access component props** - Loaders receive the `context` object (route params, URL, request) but not props

### Server Islands

**✅ Fully Supported!**

Server Islands work automatically because each Server Island request creates its own execution context. No special configuration needed!

**How it works:**

- **Regular SSR pages:** Middleware sets up context → Components register loaders → First `getLoaderData()` call executes all loaders in parallel
- **Server Islands:** Same process runs independently for each Server Island request

The lazy execution model ensures that only the loaders needed for the rendered components execute, whether in the initial page or in a Server Island. ✨

## Troubleshooting

### Error: "Middleware not configured"

**Full error:**

```
[astro-auto-load] Middleware not configured. Ensure autoLoadMiddleware is running.
```

**Cause:** You have a custom `src/middleware.ts` file, and `autoLoadMiddleware` is not included.

**Solution:** Manually add `autoLoadMiddleware` to your middleware chain:

```ts
// src/middleware.ts
import { sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

export const onRequest = sequence(
  // your other middleware...
  autoLoadMiddleware,
);
```

### Error: "Module URL not found"

**Full error:**

```
[astro-auto-load] Module URL not found. This should be auto-injected by the Vite plugin.
```

**Cause:** The Vite plugin transformation failed or the integration wasn't added to `astro.config.mjs`.

**Solution:** Ensure the integration is properly installed:

```js
// astro.config.mjs
import autoLoad from 'astro-auto-load';

export default defineConfig({
  output: 'server', // required
  integrations: [autoLoad()],
});
```

## License

MIT

## Contributing

Issues and PRs welcome! This is an experimental integration.
