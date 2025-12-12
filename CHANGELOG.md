# Changelog

All notable changes to this project will be documented in this file.

## [0.1.6] - Advanced Usage

### Added

- **Custom LoaderContext support:** You can now extend the context passed to all loader functions using TypeScript module augmentation, enabling richer data and services (e.g., authentication or database clients) to be provided to your loaders.
- **Manual middleware composition:** If you have an existing `src/middleware.ts`, you can manually compose your own middleware with `autoLoadMiddleware()` using Astro's `sequence()` helper.
- **Dedupe helper in context:** Loader functions receive a convenient `dedupe` utility for per-request promise deduplication. This enables multiple components to safely fetch the same resource without triggering duplicate requests.
- **Improved type inference:** More reliable inference for `Loader<typeof loader>` throughout runtime and DX, including utility types for extracting loader return data.
- **Automatic and manual middleware injection logic clarified:** Middleware is now always injected automatically **unless** you have a manual `src/middleware.ts` export, in which case you can compose `autoLoadMiddleware()` as needed.

### Changed

- **Vite plugin registration improvements:** Loaders are now automatically detected and registered at build time, ensuring that all astro components with loaders are properly hooked up without manual intervention.
- **getData is now getLoaderData** Renamed loader data access function for clarity
- **getLoaderData automatic arguments:** Vite plugin now automatically transforms usages of `getLoaderData()` to correctly provide internal arguments (`Astro`, `import.meta.url`), eliminating manual configuration in user code.

### Fixed

- Loader registration now works reliably for both regular SSR pages and Server Islands, ensuring data loading just works in all rendering contexts.
- Middleware now correctly skips `/_astro`, `/assets`, and `/api` paths by default to avoid unnecessary loader execution for static or API requests.
- Improved error handling and developer messages for missing or misconfigured loaders.

### Documentation

- Refined README with complete usage examples, custom context patterns, dedupe usage, and advanced customization.
- Added "How it works" and FAQ sections for deeper understanding and troubleshooting.

---

## [0.1.0] - Initial Release

### Added

- Initial implementation of astro-auto-load integration
- Automatic detection of `export const loader` functions in Astro components
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
- **Type-safe**: Full TypeScript support with automatic type inference via `Loader<typeof loader>`
- **Composable**: Can still manually compose with custom middleware if needed
