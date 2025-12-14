# Implementation Plan: Static Site Generation (SSG) Support

## Current State Analysis

### SSR-Only Architecture

- Middleware initializes request-scoped registry via AsyncLocalStorage
- Components register loaders during rendering
- First `getLoaderData()` call triggers parallel execution of all registered loaders
- Vite plugin extracts child loaders at build time for parallel discovery
- **Requires:** `output: 'server'` in Astro config

### Key Limitations for SSG

1. Middleware only runs during SSR requests, not during static builds
2. AsyncLocalStorage is request-scoped (no requests in SSG)
3. No Request object available during build
4. Different execution timing (build-time vs runtime)

---

## Proposed Architecture: Hybrid Execution Model

### Goal

Support three modes with same API:
- `output: 'static'` - Pure SSG
- `output: 'server'` - Pure SSR (current)
- `output: 'hybrid'` - Mix of static and server routes

### Core Strategy: Build-time vs Runtime Execution

#### Mode A: Static Generation (`output: 'static'`)

1. **Build Phase:** Execute loaders during page rendering
2. **Context:** Derive from route params (no Request object)
3. **Registry:** Use build-time global registry (not AsyncLocalStorage)
4. **Results:** Serialize into static HTML or inject as props
5. **No middleware needed**

#### Mode B: SSR (`output: 'server'`)

- Current implementation (no changes needed)

#### Mode C: Hybrid (`output: 'hybrid'`)

- Static routes: Use Mode A approach
- Server routes: Use Mode B approach
- **Detection:** Check route prerender status

---

## Implementation Phases

### Phase 1: Context Abstraction

**File:** `src/runtime/types.ts`

```typescript
export interface Context {
  params: Record<string, string>;
  url: URL;
  request?: Request; // Make optional for SSG
  dedupe: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  mode: 'ssr' | 'ssg'; // Add mode indicator
}
```

**Changes:**
- Make `request` optional
- Add `mode` field to distinguish execution context
- Update type guards for SSG-safe operations

**File:** `src/runtime/context.ts`

```typescript
export function createLoaderContext(options: {
  params: Record<string, string>;
  request?: Request;
  url: URL;
  mode: 'ssr' | 'ssg';
  extend?: () => Record<string, any>;
}): Context
```

---

### Phase 2: Build-Time Registry

**New File:** `src/runtime/build-registry.ts`

Create a global registry for build-time execution:

```typescript
/**
 * Global registry for SSG builds (not request-scoped).
 * Maps route paths to their loader registries.
 */
class BuildTimeRegistry {
  private routeRegistries = new Map<string, Map<string, LoaderFn>>();
  
  getRegistryForRoute(routePath: string): Map<string, LoaderFn> {
    // Create/return registry for specific route
  }
  
  clearRoute(routePath: string): void {
    // Clear after route is rendered
  }
}
```

**Key Differences from SSR:**
- No AsyncLocalStorage (global, not request-scoped)
- Route-based isolation instead of request-based
- Cleared after each route is rendered

---

### Phase 3: Build-Time Executor

**File:** `src/runtime/orchestrator.ts`

Add new executor for SSG:

```typescript
export class BuildTimeLoaderExecutor {
  // Similar to LazyLoaderExecutor but:
  // 1. Uses build-time registry
  // 2. No Request object in context
  // 3. Different stability detection (no middleware timing)
  // 4. Results stored differently (for serialization)
}
```

**Execution Strategy:**
1. Components register loaders during build-time render
2. Vite plugin still extracts child loaders
3. First `getLoaderData()` triggers parallel execution
4. Results cached for that route's render

---

### Phase 4: Astro Integration Hooks

**File:** `src/index.ts`

Add build-time initialization:

```typescript
export default function autoLoad(): AstroIntegration {
  return {
    name: 'astro-auto-load',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, addMiddleware }) => {
        const isSSR = config.output === 'server';
        const isHybrid = config.output === 'hybrid';
        const isSSG = config.output === 'static';
        
        // Vite plugin works for all modes
        updateConfig({
          vite: {
            plugins: [astroAutoLoadVitePlugin({ mode: config.output })],
          },
        });
        
        // Middleware only for SSR/hybrid
        if (isSSR || isHybrid) {
          addMiddleware({
            entrypoint: 'astro-auto-load/middleware',
            order: 'pre',
          });
        }
      },
      
      // New hook for SSG
      'astro:build:setup': ({ vite, target }) => {
        if (target === 'server') return; // Skip for SSR builds
        
        // Inject global build-time helpers
        // These make loaders execute during static page renders
      },
      
      // Optional: per-route execution
      'astro:route:setup': ({ route }) => {
        // Could use to initialize per-route registry
        // Or detect prerender status for hybrid mode
      }
    }
  };
}
```

---

### Phase 5: Hybrid Mode Support

**Challenge:** `output: 'hybrid'` mixes static and server routes

**Solution:** Runtime detection in helper functions

**File:** `src/runtime/helpers.ts`

```typescript
export async function getLoaderData<T = any>(): Promise<T> {
  // Detect execution context
  const inBuild = typeof process !== 'undefined' && 
                  process.env.ASTRO_BUILD === 'true';
  
  if (inBuild) {
    // Use BuildTimeLoaderExecutor
    return getBuildTimeLoaderData();
  } else {
    // Use LazyLoaderExecutor (current SSR path)
    return getSSRLoaderData();
  }
}
```

**Alternative:** Check `Astro.request` availability
```typescript
if (!Astro.request) {
  // SSG mode
} else {
  // SSR mode
}
```

---

### Phase 6: Vite Plugin Enhancements

**File:** `src/vite-plugin.ts`

**Changes needed:**

1. **Mode awareness:**
```typescript
export function astroAutoLoadVitePlugin(options?: { 
  mode?: 'server' | 'static' | 'hybrid' 
}) {
  const mode = options?.mode ?? 'server';
  
  // Inject different runtime based on mode
}
```

2. **Different code injection for SSG:**
```typescript
// For SSG, inject:
import { registerBuildTimeLoader } from 'astro-auto-load/build-runtime';

// Instead of:
import { registerLoader } from 'astro-auto-load/runtime';
```

3. **Context creation differs:**
```typescript
// SSG context (no request)
const context = {
  params: Astro.params,
  url: Astro.url,
  mode: 'ssg'
};

// vs SSR context
const context = {
  params: Astro.params,
  url: Astro.url,
  request: Astro.request,
  mode: 'ssr'
};
```

---

### Phase 7: Data Serialization Strategy

**Challenge:** Loader results need to be available in static HTML

**Options:**

#### Option A: Inline JSON (Recommended)
```typescript
// Inject into page during build:
<script type="application/json" id="__ASTRO_LOADER_DATA__">
  {
    "/components/Header.astro": { title: "...", ... },
    "/components/Footer.astro": { ... }
  }
</script>

// Runtime reads from script tag
```

#### Option B: Astro.props injection
```typescript
// During build, pass to component via props
const loaderData = await executeLoadersForComponent();
return <Component data={loaderData} />;

// Component accesses via Astro.props.__loaderData
```

#### Option C: Virtual modules
```typescript
// Generate virtual module per route during build
export const __loaderData__ = { ... };

// Import in components
import { __loaderData__ } from 'virtual:astro-auto-load';
```

**Recommendation:** Option A (inline JSON) is cleanest and most compatible

---

### Phase 8: Testing Strategy

**New test files needed:**

1. **`test/ssg.test.ts`** - Basic SSG functionality
2. **`test/hybrid.test.ts`** - Mixed mode support
3. **`test/e2e-ssg/`** - SSG E2E fixtures

**Test coverage:**
- Static build produces correct output
- Loaders execute during build (not runtime)
- No middleware in SSG mode
- Context.request is undefined in SSG
- Parallel execution still works
- Hybrid mode routes correctly
- Data serialization works
- Type safety preserved

---

## Migration Path & Breaking Changes

### Good News: Should be Backward Compatible!

**For existing SSR users:**
- No changes required
- `output: 'server'` continues to work as-is
- Same API, same behavior

**For new SSG users:**
```typescript
// Just change output mode
export default defineConfig({
  output: 'static', // ← Changed from 'server'
  integrations: [autoLoad()],
});
```

### Potential Breaking Change

**Loaders that rely on `context.request` will need updates**

**Mitigation:** Make it optional, provide clear error messages

```typescript
export const loader = async (context) => {
  if (!context.request) {
    throw new Error(
      'This loader requires SSR. Set output: "server" or use hybrid mode with prerender: false'
    );
  }
  // ... use context.request
};
```

---

## Open Questions & Design Decisions

### Q1: Should loaders cache across builds?

- **No** - Each build should be fresh
- Clear registry between routes

### Q2: How to handle request-specific loaders in hybrid mode?

- Add `prerender` flag detection
- Clear error if SSG route uses request-dependent loader
- Documentation guidance on hybrid usage

### Q3: Performance implications?

- SSG build time increases (loaders run during build)
- Runtime performance improves (data pre-fetched)
- **Net positive for users**

### Q4: How to handle dynamic routes in SSG?

- Use `getStaticPaths()` params
- Loaders receive params from route generation
- Each path variant executes loaders separately

### Q5: Dedupe strategy in SSG?

- Build-time dedupe still valuable (shared dependencies)
- Use same implementation, but per-route scope
- Clear after each route renders

---

## Documentation Updates Required

1. **README.md:**
   - Update "output: 'server'" requirement
   - Add SSG examples
   - Add hybrid mode examples
   - Performance notes for build time vs runtime

2. **New docs:**
   - SSG-specific guide
   - Hybrid mode best practices
   - Migration from SSR-only loaders

3. **API reference:**
   - Document optional `context.request`
   - Document `context.mode`
   - Loader compatibility notes

---

## Estimated Complexity

### High-level Assessment

- **Phase 1-2:** Medium (2-3 days) - Context abstraction
- **Phase 3:** High (3-4 days) - Build-time executor logic
- **Phase 4:** Medium (2-3 days) - Integration hooks
- **Phase 5:** Low (1-2 days) - Hybrid detection
- **Phase 6:** Medium (2-3 days) - Vite plugin updates
- **Phase 7:** Medium (2-3 days) - Data serialization
- **Phase 8:** High (4-5 days) - Comprehensive testing

**Total:** ~20-26 days of development

### Risk Areas

- Build-time execution timing (when do loaders run?)
- Data serialization edge cases
- Hybrid mode complexity
- Backward compatibility testing

---

## Recommended Approach

### Start Small, Iterate

1. **MVP:** Pure SSG support (`output: 'static'` only)
2. **V2:** Add hybrid mode
3. **V3:** Optimizations and edge cases

### MVP Scope

- Phases 1, 2, 3, 4, 6, 7 (core SSG)
- Skip Phase 5 initially (hybrid can come later)
- Basic testing

This gets SSG working first, then adds hybrid as enhancement.
