# astro-auto-load

Automatic component-level data loading for Astro SSR. Co-locate your data fetching logic with your components while eliminating waterfalls and duplicate requests.

## The Problem

In typical Astro SSR apps, you face a choice:

1. **Fetch data in the page** - Causes waterfalls when components need different data
2. **Props drilling** - Pass data from page to deeply nested components (verbose and brittle)
3. **Fetch in components** - Simple API, but can't `await` in component scripts, leading to duplicate fetches

## The Solution

`astro-auto-load` lets you define `loader` functions directly in your components. The integration:

✅ **Collects all loaders** before rendering  
✅ **Runs them in parallel** (no waterfalls)  
✅ **Deduplicates promises** via utility function  
✅ **Provides type-safe data** to your components

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
  output: 'server', // or 'hybrid' - required for SSR
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
// src/components/Story.astro
import { getLoaderData, type Loader } from 'astro-auto-load/runtime';

type Data = Loader<typeof loader>;

export const loader = async (context) => {
  const res = await fetch(`https://api.example.com/stories/${context.params.id}`);
  return res.json();
};

// Type inference works automatically! ✨
const data = await getLoaderData<Data>();
---

{data && (
  <article>
    <h2>{data.title}</h2>
    <p>{data.body}</p>
  </article>
)}
```

### Using Route Parameters

```astro
---
// src/pages/posts/[id].astro
import Story from '@/components/Story.astro';
---

<Story />
```

The `context.params` will contain `{ id: "123" }` when visiting `/posts/123`.

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
- Type-safe data access with inference via `getLoaderData<Data>();`

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

The package includes full TypeScript support with automatic type inference from your loaders.

### Infer Types from Loaders

The recommended approach - let TypeScript infer types automatically:

```astro
---
import { getLoaderData, type Loader } from 'astro-auto-load/runtime';

export const loader = async (context) => {
  return {
```astro
---
import { getLoaderData, type Loader } from 'astro-auto-load/runtime';

export const loader = async (context) => {
  return {
    name: 'Hugo',
    age: 42,
    hobbies: ['coding', 'cats']
  };
};

// Type is automatically inferred from the loader! ✨
const data = await getLoaderData<Loader<typeof loader>>();
// data?.name is string
// data?.age is number
// data?.hobbies is string[]
---
```

### Extracting Types

You can extract the loader's return type for reuse:

```ts
import { type Loader } from 'astro-auto-load/runtime';

const loader = async (context) => ({ count: 42 });

export type Data = Loader<typeof loader>; // { count: number }

// Use the type elsewhere
function processData(data: Data) {
  console.log(data.count);
}
```

## Limitations

- **Only works in SSR mode** (not static builds)
- **Loaders run on-demand** - Results are cached per request, but there's no persistent caching across requests
- **Loaders cannot access component props** - Loaders receive the `Context` object (route params, URL, request) but not component props

### Server Islands

**✅ Fully Supported!**

Server Islands work automatically because each Server Island request creates its own execution context. No special configuration needed!

**How it works:**

- **Regular SSR pages:** Middleware sets up context → Components register loaders → First `getLoaderData()` call executes all loaders in parallel
- **Server Islands:** Same process runs independently for each Server Island request

The lazy execution model ensures that only the loaders needed for the rendered components execute, whether in the initial page or in a Server Island. ✨

## License

MIT

## Contributing

Issues and PRs welcome! This is an experimental integration.
