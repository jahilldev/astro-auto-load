# Improvement: Automatic Middleware Injection

## Summary

**Your plugin now automatically injects the middleware!** Users no longer need to manually create `src/middleware.ts`.

## What Changed

### Before
Users had to:
1. Add integration to `astro.config.mjs`
2. **Create `src/middleware.ts`** ← Manual step
3. Import and add `autoLoadMiddleware()`

### After
Users only need to:
1. Add integration to `astro.config.mjs`
2. Start using loaders in components

**That's it!** The middleware is automatically injected.

## Technical Implementation

### 1. Updated `src/index.ts`
```ts
export default function autoLoad(): AstroIntegration {
  return {
    name: 'astro-auto-load',
    hooks: {
      'astro:config:setup': ({ addMiddleware, ... }) => {
        // ... vite plugin setup ...
        
        // Auto-inject middleware
        addMiddleware({
          entrypoint: 'astro-auto-load/middleware',
          order: 'pre',
        });
      },
    },
  };
}
```

### 2. Updated `src/runtime/middleware.ts`
```ts
// Added default export for Astro's automatic detection
export const onRequest = autoLoadMiddleware();
```

### 3. Updated Documentation
- README.md: Removed middleware setup section
- QUICKSTART.md: Simplified to 2 steps (was 3)
- Examples: Updated to show optional composition only
- TESTING.md: Updated debugging instructions

## Benefits

✅ **Simpler DX**: One less file to create  
✅ **Fewer errors**: Can't forget middleware setup  
✅ **Zero-config**: Works out of the box  
✅ **Still flexible**: Power users can manually compose  

## Backward Compatibility

✅ **Fully compatible**: Existing manual middleware setups still work  
✅ **Can be overridden**: Users can create `src/middleware.ts` if they need custom composition  
✅ **No breaking changes**: Just reduces required steps  

## What Users See Now

### Complete Setup
```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import autoLoad from 'astro-auto-load';

export default defineConfig({
  output: 'server',
  integrations: [autoLoad()], // 👈 Done!
});
```

### Using Loaders
```astro
---
import { getLoaderData } from 'astro-auto-load/runtime/helpers';

export const load = async (ctx) => {
  return fetch(`/api/data/${ctx.params.id}`).then(r => r.json());
};

const data = getLoaderData(Astro, import.meta.url);
---

<div>{data.title}</div>
```

## Advanced Usage (Optional)

Users who need custom middleware can still compose:

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';
import { autoLoadMiddleware } from 'astro-auto-load/middleware';

const myMiddleware = defineMiddleware(async (context, next) => {
  console.log('Custom logic');
  return next();
});

export const onRequest = sequence(myMiddleware, autoLoadMiddleware());
```

## Files Updated

✅ `src/index.ts` - Added `addMiddleware` call  
✅ `src/runtime/middleware.ts` - Added `onRequest` export  
✅ `README.md` - Simplified setup section  
✅ `QUICKSTART.md` - Reduced to 2 steps  
✅ `TESTING.md` - Updated debugging tips  
✅ `CHANGELOG.md` - Documented new feature  
✅ `examples/` - Updated example files  
✅ `SETUP_COMPARISON.md` - Created before/after comparison  

## Build Status

✅ TypeScript compiles successfully  
✅ All exports working correctly  
✅ Middleware properly exported  
✅ Ready for testing  

## Next Steps for Testing

1. Create a new Astro project
2. Install/link the plugin
3. Add just the integration to config
4. **Don't create src/middleware.ts**
5. Create a component with a loader
6. Verify it works automatically

The plugin is now even easier to use! 🚀

