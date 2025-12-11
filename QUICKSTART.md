# Quick Start Guide

Get up and running with `astro-auto-load` in 5 minutes.

## 1. Install

```bash
npm install astro-auto-load
```

## 2. Configure Astro

Edit `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import autoLoad from 'astro-auto-load';

export default defineConfig({
  output: 'server', // or 'hybrid' - required for SSR
  integrations: [autoLoad()],
});
```

**That's it!** The middleware is automatically set up. No need to create `src/middleware.ts`.

## 3. Create a Component with a Loader

Create `src/components/UserProfile.astro`:

```astro
---
import { getData, type Loader } from 'astro-auto-load';

// This function runs BEFORE the page renders
export const load = async (ctx) => {
  const userId = ctx.params.id;
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${userId}`);
  return res.json() as Promise<{ id: string; name: string; email: string }>;
};

// Type is automatically inferred from the loader!
const user = getData<Loader<typeof load>>(Astro, import.meta.url);
---

{user ? (
  <div class="user-profile">
    <h2>{user.name}</h2>
    <p>Email: {user.email}</p>
  </div>
) : (
  <p>User not found</p>
)}

<style>
  .user-profile {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }
</style>
```

## 4. Use in a Page

Create `src/pages/users/[id].astro`:

```astro
---
import UserProfile from '@/components/UserProfile.astro';
---

<html>
  <head>
    <title>User Profile</title>
  </head>
  <body>
    <h1>User Profile</h1>
    <UserProfile />
  </body>
</html>
```

## 5. Run Your Dev Server

```bash
npm run dev
```

Visit `http://localhost:4321/users/1` to see it in action!

## What Just Happened?

1. The integration automatically injected middleware into your Astro app
2. The Vite plugin detected `export const load` in `UserProfile.astro`
3. It automatically registered the loader function
4. When you visit `/users/1`, the middleware runs the loader with `params.id = "1"`
5. The data is fetched in parallel with any other loaders on the page
6. The component accesses its data via `getData()`

## Next Steps

- Check out the full [README](./README.md) for advanced features
- Look at the [examples](./examples/) directory for more patterns
- Learn about [deduplication](./README.md#deduplication) to prevent duplicate requests

## Troubleshooting

**Q: My loader isn't running**

- Make sure you have `output: 'server'` or `output: 'hybrid'` in your Astro config
- Verify the integration is added: `integrations: [autoLoad()]`
- Check that your loader is exported: `export const load = ...`
- Look in the browser console for any errors

**Q: I'm getting TypeScript errors**

- Add `/// <reference types="astro-auto-load/augment" />` to `src/env.d.ts`
- Make sure you've run `npm run build` if developing locally

**Q: Data is undefined in my component**

- Ensure you're passing `import.meta.url` to `getData()`
- Check the Network tab to see if your API calls are succeeding
- Verify the loader function is returning data (not throwing errors)
