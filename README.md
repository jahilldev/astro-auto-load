# astro-auto-load

Automatic component-level data loading for Astro SSR. Co-locate your data fetching logic with your components while **eliminating async waterfalls** through recursive loader extraction.

## Key Features

✨ **True Parallel Execution** - All loaders execute simultaneously, even for deeply nested components  
🎯 **Recursive Extraction** - Discovers entire component tree at build-time (direct imports AND slot-based composition)  
⚡ **Zero Waterfalls** - Achieves ~67% performance improvement by eliminating sequential async chains  
🔒 **Type-Safe** - Full TypeScript support with automatic type inference  
🎨 **Zero Config** - Drop-in integration, works automatically with no manual setup
🧩 **Flexible Composition** - Supports both direct imports and slot-based patterns

## The Problem

In typical Astro SSR apps, you face a choice:

1. **Props drilling** - Pass data from page to deeply nested components (verbose and brittle, and couples component trees). Not fun for complex apps.
2. **Fetch in components** - Nice DX, but Astro resolves promises sequentially (async waterfall), hurting render times and TTFB.

## The Solution

`astro-auto-load` uses **recursive loader extraction** to discover your entire component tree at build-time, extract all loader functions, and execute them in a single parallel batch.

### Performance Impact

The performance benefit depends on your component structure:

#### 🚀 **Sibling Components** (Major Win!)

**Before** (Traditional Async):

```
Page renders: <Component1 />, <Component2 />, <Component3 />
Each component: ~50ms data fetch (sequential)
Total: ~150ms waterfall
```

**After** (astro-auto-load):

```
Page renders: <Component1 />, <Component2 />, <Component3 />
Each component: ~50ms data fetch (parallel!)
Total: ~50ms
```

**Result:** ~67% faster! All sibling components execute in parallel ⚡

#### 🎯 **Nested Components** (Win with Recursive Extraction!)

**Before** (Traditional Async):

```
<Parent> → <Child> → <Grandchild>
Each: ~50ms data fetch (sequential due to nesting)
Total: ~150ms waterfall
```

**After** (astro-auto-load):

```
<Parent> → <Child> → <Grandchild>
All loaders extracted and executed in parallel!
Total: ~50ms
```

**Result:** ~67% faster! Recursive extraction eliminates waterfalls even for nested components ⚡

#### ✅ **Real-World Benefit**

The plugin achieves **true parallel execution** for:

- ✅ **Sibling components** - ~67% faster
- ✅ **Nested components** (direct imports OR slot-based) - ~67% faster via recursive extraction
- ✅ **Complex component trees** - all loaders execute simultaneously

This works through **recursive loader extraction**: the plugin discovers your entire component tree at build-time (including slot-based children), extracts all loader functions, and registers them upfront so they execute in a single parallel batch. Verified by [E2E tests](test/e2e.test.ts).

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

The integration uses **recursive loader extraction** to achieve true parallel execution:

1. **Build-time (Vite Plugin)**:
   - Recursively discovers your entire component tree (including slot-based children)
   - Extracts all `loader` functions from discovered components
   - Injects extracted loaders into parent frontmatter with unique registration keys
   - Marks extracted children to skip duplicate registration

2. **Runtime (Middleware)**:
   - Sets up `AsyncLocalStorage` to track loaders during each request

3. **Runtime (Component Execution)**:
   - Parent component registers all extracted loaders (children + self) upfront
   - Child components detect their loader was already extracted and skip registration
   - First call to `getLoaderData()` triggers parallel execution of ALL registered loaders
   - Results are cached in `Astro.locals.autoLoad` for the remainder of the request
   - All components retrieve their data using `await getLoaderData()`

**Benefits:**

- ✅ **True parallel execution** - even nested component loaders execute simultaneously
- ✅ **Works with slot-based composition** - recursive extraction discovers all children
- ✅ **Zero waterfalls** - all loaders in the component tree execute in one batch
- ✅ **Type-safe** - automatic type inference via `getLoaderData<typeof loader>()`
- ✅ **Automatic** - no manual configuration needed (auto-wrapper for pages without loaders)

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

### Routes Automatically Skipped

The middleware automatically skips the following paths for performance:

- `/_astro/*` - Astro build assets
- `/assets/*` - Static assets
- `/api/*` - API routes

These routes bypass loader execution entirely.

### Skipping Additional Routes

To skip additional paths (e.g., admin routes), create a wrapper middleware:

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

const conditionalAutoLoad = defineMiddleware(async (context, next) => {
  // Skip admin routes
  if (context.url.pathname.startsWith('/admin')) {
    return next();
  }

  // Otherwise, run autoLoadMiddleware (which has its own built-in skips)
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
import { type Context, getLoaderData } from 'astro-auto-load/runtime';

export const loader = async (context: Context) => {
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
- **Per-request execution** - Loaders execute on each request; results are cached within the request but not across requests
- **Loaders cannot access component props** - Loaders receive the `context` object (route params, URL, request) but not props passed to the component
- **Build-time discovery** - Component tree is analyzed at build time, so dynamic imports or runtime-conditional components won't have their loaders extracted

**What IS supported:**

- ✅ Direct imports (`import Child from './Child.astro'`)
- ✅ Slot-based composition (children passed via `<slot />`)
- ✅ Deeply nested component trees (any depth)
- ✅ Conditional rendering with `{condition && <Component />}` (loader is extracted, just won't execute if component doesn't render)
- ✅ Component reuse (same component used multiple times)

**What is NOT supported:**

- ❌ Dynamic imports (`const Component = await import('./Component.astro')`)
- ❌ Static site generation (requires SSR)

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
