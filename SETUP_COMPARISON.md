# Setup Comparison: Before vs After

## ❌ Old Setup (Manual Middleware)

Users had to perform **3 steps**:

### Step 1: Add integration
```js
// astro.config.mjs
import autoLoad from 'astro-auto-load';

export default defineConfig({
  output: 'server',
  integrations: [autoLoad()],
});
```

### Step 2: Create middleware file
```ts
// src/middleware.ts
import { autoLoadMiddleware } from 'astro-auto-load/middleware';
import { sequence } from 'astro:middleware';

export const onRequest = sequence(autoLoadMiddleware());
```

### Step 3: Use in components
```astro
---
// src/components/Story.astro
import { getData } from 'astro-auto-load/runtime/helpers';

export const load = async (ctx) => {
  return fetch(`/api/story/${ctx.params.id}`).then(r => r.json());
};

const data = getData(Astro, import.meta.url);
---
<article>{data.title}</article>
```

---

## ✅ New Setup (Automatic Middleware)

Users now only need **2 steps**:

### Step 1: Add integration
```js
// astro.config.mjs
import autoLoad from 'astro-auto-load';

export default defineConfig({
  output: 'server',
  integrations: [autoLoad()], // 👈 Middleware auto-injected!
});
```

### Step 2: Use in components
```astro
---
// src/components/Story.astro
import { getData } from 'astro-auto-load/runtime/helpers';

export const load = async (ctx) => {
  return fetch(`/api/story/${ctx.params.id}`).then(r => r.json());
};

const data = getData(Astro, import.meta.url);
---
<article>{data.title}</article>
```

**That's it!** No `src/middleware.ts` needed. 🎉

---

## How It Works

The integration uses Astro's `addMiddleware` API:

```ts
// In src/index.ts
export default function autoLoad(): AstroIntegration {
  return {
    name: 'astro-auto-load',
    hooks: {
      'astro:config:setup': ({ addMiddleware, ... }) => {
        // Auto-inject the middleware
        addMiddleware({
          entrypoint: 'astro-auto-load/middleware',
          order: 'pre',
        });
      },
    },
  };
}
```

The middleware file exports a default `onRequest` handler:

```ts
// In src/runtime/middleware.ts
export const onRequest = autoLoadMiddleware();
```

Astro automatically discovers and uses this when the integration calls `addMiddleware`.

---

## Advanced: Custom Middleware Composition

If you need to add your own middleware, you can still do so:

```ts
// src/middleware.ts (optional)
import { defineMiddleware, sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

const myMiddleware = defineMiddleware(async (context, next) => {
  // Your custom logic
  return next();
});

// Compose them together
export const onRequest = sequence(myMiddleware, autoLoadMiddleware());
```

This gives power users full control while keeping the default case dead simple.

---

## Benefits

✅ **Simpler onboarding**: One less file to create  
✅ **Fewer errors**: No chance of forgetting middleware setup  
✅ **Still flexible**: Can manually compose if needed  
✅ **Better DX**: Zero-config just works  

