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
✅ **Deduplicates requests** automatically  
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

**That's it!** The middleware is automatically injected.

> **Note:** If you have an existing `src/middleware.ts` file, you'll need to manually add `autoLoadMiddleware()` to your middleware chain. See [Custom Middleware Composition](#custom-middleware-composition) below.

### 2. (Optional) Add TypeScript support

Create `src/env.d.ts` if it doesn't exist:

```ts
/// <reference types="astro/client" />
/// <reference types="astro-auto-load/augment" />
```

## Usage

### Basic Example

Define a loader in your component:

```astro
---
// src/components/Story.astro
import { getData, type Loader } from 'astro-auto-load/runtime';

// Define your loader - it receives route params, URL, request, etc.
export const loader = async (ctx) => {
  const res = await fetch(`https://api.example.com/stories/${ctx.params.id}`);
  return res.json() as Promise<{ id: string; title: string; body: string }>;
};

// Type is automatically inferred from the loader!
const data = getData<Loader<typeof loader>>(Astro, import.meta.url);
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

The `ctx.params` will contain `{ id: "123" }` when visiting `/posts/123`.

### Deduplication

If multiple components request the same data, use the built-in dedupe helper:

```astro
---
import { getData, type LoaderContext } from 'astro-auto-load/runtime';

export const loader = async (ctx: LoaderContext) => {
  // This will only execute once per request, even if used by multiple components
  return ctx.dedupe(
    async (id: string) => {
      const res = await fetch(`https://api.example.com/stories/${id}`);
      return res.json();
    },
    ctx.params.id
  );
};

const data = getData(Astro, import.meta.url);
---
```

## How It Works

1. **Build-time**: The Vite plugin scans your `.astro` components for `export const loader` functions
2. **Build-time**: It automatically injects code to register each loader
3. **Runtime**: The middleware runs before rendering, collecting all registered loaders
4. **Runtime**: All loaders execute in parallel (no waterfalls!)
5. **Runtime**: Results are stored in `Astro.locals.autoLoad`
6. **Runtime**: Components retrieve their data using `getData()`

## API Reference

### `LoaderContext`

The context object passed to every loader function:

```ts
interface LoaderContext {
  /** Route parameters (e.g., { id: "123" } for /posts/[id]) */
  params: Record<string, string>;

  /** Full URL object */
  url: URL;

  /** Original Request object */
  request: Request;

  /** Dedupe helper to prevent duplicate async calls */
  dedupe: <T>(fn: (...args: any[]) => Promise<T>, ...args: any[]) => Promise<T>;
}
```

### `getData<T>(astro, moduleUrl)`

Retrieves the loaded data for the current component.

- `astro`: The Astro global object
- `moduleUrl`: Pass `import.meta.url`
- Returns: The data returned by your loader, or `undefined` if not found

### `autoLoadMiddleware()`

Creates the middleware that executes all loaders before rendering.

## Advanced Usage

### Custom Context

You can extend the `LoaderContext` type via module augmentation:

```ts
// src/types/astro-auto-load.d.ts
import 'astro-auto-load/runtime/types';

declare module 'astro-auto-load/runtime/types' {
  interface LoaderContext {
    // Add custom properties
    db: DatabaseClient;
    auth: AuthService;
  }
}
```

Then create a custom context factory:

```ts
// src/lib/custom-context.ts
import { createLoaderContext as baseCreateContext } from 'astro-auto-load/runtime/context';
import type { LoaderContext } from 'astro-auto-load/runtime/types';

export function createCustomLoaderContext(
  params: Record<string, string>,
  request: Request,
): LoaderContext {
  const baseContext = baseCreateContext(params, request);

  return {
    ...baseContext,
    db: getDbClient(),
    auth: getAuthService(),
  };
}
```

### Custom Middleware Composition

**Important:** The integration automatically injects middleware **only if you don't have a `src/middleware.ts` file**.

#### If you have existing middleware:

If you already have a `src/middleware.ts` file with `export const onRequest`, you **must** manually include `autoLoadMiddleware()`:

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

const myMiddleware = defineMiddleware(async (context, next) => {
  // Your custom logic
  console.log('Request:', context.url.pathname);
  return next();
});

// IMPORTANT: Include autoLoadMiddleware() in your sequence!
export const onRequest = sequence(myMiddleware, autoLoadMiddleware());
```

#### If you don't have middleware:

The integration automatically injects it for you - no `src/middleware.ts` needed! ✨

**Why?** Astro uses **either** your manual `src/middleware.ts` export **or** integration-injected middleware, but not both. If you export `onRequest` yourself, you take full control and must include `autoLoadMiddleware()` in your chain.

### Skipping Routes

The middleware automatically skips `/_astro`, `/assets`, and `/api` paths. To customize this behavior, create your own wrapper:

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { runAllLoadersForRequest } from 'astro-auto-load/runtime/orchestrator';

const customAutoLoad = defineMiddleware(async (context, next) => {
  // Custom skip logic
  if (context.url.pathname.startsWith('/admin')) {
    return next();
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(context.params)) {
    if (value !== undefined) params[key] = value;
  }

  const { dataByModule } = await runAllLoadersForRequest(params, context.request);
  context.locals.autoLoad = dataByModule;
  return next();
});

export const onRequest = customAutoLoad;
```

## TypeScript

The package includes full TypeScript support with automatic type inference from your loaders.

### Infer Types from Loaders

The recommended approach - let TypeScript infer types automatically:

```astro
---
import { getData, type Loader } from 'astro-auto-load/runtime';

export const loader = async (ctx) => {
  return {
    name: 'James',
    age: 38,
    hobbies: ['coding', 'gaming']
  };
};

// Type is automatically inferred from the loader!
const data = getData<Loader<typeof loader>>(Astro, import.meta.url);
// data.name is string
// data.age is number
// data.hobbies is string[]
---
```

### Extracting Types

You can extract the loader's return type for reuse:

```ts
import { type Loader } from 'astro-auto-load/runtime';

const loader = async (ctx) => ({ count: 42 });

export type Data = Loader<typeof loader>; // { count: number }

// Use the type elsewhere
function processData(data: Data) {
  console.log(data.count);
}
```

## Limitations

- Only works in SSR mode (not static builds)
- Loaders run on every request (consider adding your own caching layer)
- Component must use `import.meta.url` to look up its own data

## License

MIT

## Contributing

Issues and PRs welcome! This is an experimental integration.
