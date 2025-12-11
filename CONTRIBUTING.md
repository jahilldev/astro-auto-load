# Contributing to astro-auto-load

Thank you for your interest in contributing to astro-auto-load!

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

## Testing Locally

To test your changes in a real Astro project:

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

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation if adding new features
- Ensure the build passes: `npm run build`
- Add examples for new features
- Update CHANGELOG.md

## Questions?

Feel free to open an issue for any questions or concerns!

