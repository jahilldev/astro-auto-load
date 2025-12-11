# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - Initial Release

### Added

- Initial implementation of astro-auto-load integration
- Automatic detection of `export const load` functions in Astro components
- Parallel execution of all loaders before page render
- Built-in deduplication helper to prevent duplicate async calls
- Type-safe data access via `getData()`
- **Automatic middleware injection** via Astro's `addMiddleware` API
- TypeScript support with full type definitions
- Comprehensive documentation and examples

### Features

- **Zero-config setup**: Just add the integration - middleware is auto-injected
- **Co-located data loading**: Define loaders directly in components
- **No waterfalls**: All loaders run in parallel
- **Automatic registration**: Vite plugin detects and registers loaders
- **Request deduplication**: Built-in helper to prevent duplicate fetches
- **Type-safe**: Full TypeScript support with automatic type inference via `Loader<typeof load>`
- **Composable**: Can still manually compose with custom middleware if needed
