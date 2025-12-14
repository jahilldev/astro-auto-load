# Contributing to astro-auto-load

Thank you for your interest in contributing to `astro-auto-load`!

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/astro-auto-load.git
cd astro-auto-load
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Watch for changes during development:

```bash
npm run dev
```

## Project Structure

```
src/
├── index.ts              # Main integration export
├── middleware.ts         # Middleware orchestrator (auto-injected)
├── vite-plugin.ts        # Vite plugin for detecting loaders
├── augment.d.ts          # Type augmentation for Astro.locals
└── runtime/              # Runtime utilities (exported separately)
    ├── context.ts        # Loader context factory
    ├── dedupe.ts         # Deduplication helper
    ├── helpers.ts        # Component helper utilities
    ├── orchestrator.ts   # Parallel loader execution
    ├── registry.ts       # Global loader registry
    └── types.ts          # TypeScript type definitions
```

## Testing

### Running Tests

We have a comprehensive E2E test suite with a real Astro application fixture:

```bash
npm test
```

This runs all tests including:

- Unit tests for core functionality
- E2E tests validating parallel loader execution
- Performance comparison tests

### E2E Test Fixture

The E2E tests use a real Astro application located in `test/e2e/`:

```
test/e2e/
├── astro.config.mjs      # Test app configuration
├── package.json          # Test app dependencies
├── tsconfig.json         # TypeScript config
└── src/
    ├── components/       # Test components with various patterns
    │   ├── AsyncComponent1.astro
    │   ├── SlotParent.astro
    │   ├── ParallelChild1.astro
    │   └── ...
    └── pages/            # Test pages for different scenarios
        ├── nested.astro
        ├── slot-nested.astro
        ├── perf-comparison-with-plugin.astro
        └── ...
```

### Testing Your Changes

**No need to link or install in another app!** The E2E fixture automatically uses your local changes:

1. Make your changes to the plugin code in `src/`

2. Build the plugin:

```bash
npm run build
```

3. Run the tests:

```bash
npm test
```

The E2E tests will:

- Start a real Astro dev server on ports 4567 and 4569
- Execute all component loaders in a real SSR environment
- Validate parallel execution behavior
- Measure actual performance improvements

### Adding New Test Cases

#### Adding a Test Component

Create a new component in `test/e2e/src/components/`:

```astro
---
// YourTestComponent.astro
import { getLoaderData } from 'astro-auto-load/runtime';

export const loader = async () => {
  const start = Date.now();
  await new Promise(resolve => setTimeout(resolve, 50));
  return { start, duration: Date.now() - start };
};

const data = await getLoaderData<typeof loader>();
---
<div class="your-test" data-start={data.start} data-duration={data.duration}>
  Your test component
</div>
```

#### Adding a Test Page

Create a test page in `test/e2e/src/pages/`:

```astro
---
// your-test.astro
import YourTestComponent from '../components/YourTestComponent.astro';
---
<html>
  <body>
    <YourTestComponent />
  </body>
</html>
```

#### Adding a Test Case

Add a test in `test/e2e.test.ts`:

```typescript
it('should test your new feature', async () => {
  const response = await fetch('http://localhost:4567/your-test');
  expect(response.ok).toBe(true);

  const html = await response.text();
  // Add your assertions here
}, 15000);
```

### Performance Testing

Performance tests compare execution with and without the plugin:

```typescript
// Test WITHOUT plugin (waterfall pattern)
const withoutResponse = await fetch('http://localhost:4569/standard-nested');

// Test WITH plugin (parallel execution)
const withResponse = await fetch('http://localhost:4569/loader-nested');

// Compare timings from data-start attributes in HTML
```

Performance tests validate:

- Nested component parallelization (100% improvement)
- Sibling component parallelization (67% improvement)
- Slot-based composition parallelization (80% improvement)

### Debugging Tests

Run tests with verbose output:

```bash
npm test -- --reporter=verbose
```

Run a specific test file:

```bash
npx vitest test/e2e.test.ts
```

Run tests in watch mode during development:

```bash
npx vitest --watch
```

### Testing in a Real Project (Optional)

If you need to test in your own Astro project:

1. Build the package:

```bash
npm run build
```

2. Link it locally:

```bash
npm link
```

3. In your Astro project:

```bash
npm link astro-auto-load
```

4. Set up the integration in your `astro.config.mjs` as documented in the README

However, the E2E fixture should cover most testing needs!

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation if adding new features
- Ensure the build passes: `npm run build`
- Add examples for new features
- Update CHANGELOG.md

## Questions?

Feel free to open an issue for any questions or concerns!
