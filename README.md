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

> **Note:** If you have an existing `src/middleware.ts` file, you'll need to manually add `autoLoadMiddleware` to your middleware chain. See [Custom Middleware Composition](#custom-middleware-composition) below.

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
import { getLoaderData, type Loader } from 'astro-auto-load/runtime';

// Define shorthand type for DX or re-use elsewhere in your app
type Data = Loader<typeof loader>;

// Define your loader - it receives route params, URL, request, etc.
export const loader = async (context) => {
  const res = await fetch(`https://api.example.com/stories/${context.params.id}`);
  return res.json() as Promise<{ id: string; title: string; body: string }>;
};

// Typesafe inferrence for loader
const data = getLoaderData<Data>();
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

If multiple components request the same data, use the built-in dedupe helper with a unique key:

```astro
---
import type { LoaderContext } from 'astro-auto-load/runtime';

export const loader = async (context: LoaderContext) => {
  // Dedupe by unique key - only executes once per unique key per request
  return context.dedupe(
    `story-${context.params.id}`, // Custom cache key
    async () => {
      const res = await fetch(`https://api.example.com/stories/${context.params.id}`);
      return res.json();
    }
  );
};
---
```

The function will only execute once per unique key within a request, even if multiple components use the same loader.

## How It Works

1. **Build-time**: The Vite plugin scans your `.astro` components for `export const loader` functions
2. **Build-time**: It automatically injects code to register each loader
3. **Runtime**: The middleware runs before rendering, collecting all registered loaders
4. **Runtime**: All loaders execute in parallel (no waterfalls!)
5. **Runtime**: Results are stored in `Astro.locals.autoLoad`
6. **Runtime**: Components retrieve their data using `getLoaderData()`

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
  dedupe: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
}
```

### `getLoaderData<T>()`

Retrieves the loaded data for the current component.

### `autoLoadMiddleware`

The middleware handler that executes all loaders before rendering.

## Advanced Usage

### Custom Context

You can add custom properties to the `LoaderContext` that all loaders receive. This is useful for providing database clients, auth services, or other shared utilities.

**Step 1: Augment the LoaderContext type**

```ts
// src/loader.d.ts
import 'astro-auto-load/runtime/types';

declare module 'astro-auto-load/runtime/types' {
  interface LoaderContext {
    // Add your custom properties
    db: DatabaseClient;
    auth: AuthService;
  }
}
```

**Step 2: Create custom middleware to provide the context**

You need to manually compose middleware to inject your custom properties into the loader context:

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { runAllLoadersForRequest } from 'astro-auto-load/runtime';

const autoLoadMiddleware = defineMiddleware(async (context, next) => {
  const { dataByModule } = await runAllLoadersForRequest({
    params: context.params as Record<string, string>,
    request: context.request,
    extend: () => ({
      db: getDbClient(),
      auth: getAuthService(),
    }),
  });

  // Store results
  context.locals.autoLoad = dataByModule;

  return next();
});

export const onRequest = autoLoadMiddleware;
```

**Step 3: Use in your loaders**

```astro
---
export const loader = async (context) => {
  // context.db and context.auth are now available and type-safe!
  const user = await context.db.users.findOne({ id: context.params.id });
  const isAuthed = await context.auth.checkPermission(user);

  return { user, isAuthed };
};
---
```

**Note:** If you need custom context, you'll be writing your own middleware composition anyway, so the automatic middleware injection won't apply.

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

The middleware automatically skips `/_astro`, `/assets`, and `/api` paths. To customize this behavior, create your own wrapper:

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { runAllLoadersForRequest } from 'astro-auto-load/runtime';

const customAutoLoad = defineMiddleware(async (context, next) => {
  // Custom skip logic
  if (context.url.pathname.startsWith('/admin')) {
    return next();
  }

  const params: Record<string, string> = {};

  for (const [key, value] of Object.entries(context.params)) {
    if (value !== undefined) params[key] = value;
  }

  const { dataByModule } = await runAllLoadersForRequest({
    params,
    request: context.request,
  });

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
import { getLoaderData, type Loader } from 'astro-auto-load/runtime';

export const loader = async (context) => {
  return {
    name: 'Hugo',
    age: 42,
    hobbies: ['coding', 'cats']
  };
};

// Type is automatically inferred from the loader!
const data = getLoaderData<Loader<typeof loader>>();
// data.name is string
// data.age is number
// data.hobbies is string[]
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
- **Loaders run on every request** - Consider adding your own caching layer for frequently accessed data

### Server Islands

**✅ Fully Supported!**

Server Islands work automatically because Astro runs middleware for Server Island requests. No special configuration needed!

**How it works:**

- **Regular SSR pages:** Middleware runs → Pre-loads all loaders in parallel → Components get data via `getLoaderData()`
- **Server Islands:** Middleware runs (on the Server Island request) → Pre-loads loaders → Components get data via `getLoaderData()`

The Vite plugin automatically registers all loaders so middleware can discover them. Whether your component renders in the initial page or as a Server Island, the data loading just works! ✨

## License

MIT

## Contributing

Issues and PRs welcome! This is an experimental integration.
