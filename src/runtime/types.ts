/**
 * The context object passed to all loader functions.
 *
 * Contains request data and utilities for data loading.
 * Users can extend this type via module augmentation if needed.
 */
export interface LoaderContext {
  /** Route parameters from Astro (e.g., { id: "123" } for /posts/[id]) */
  params: Record<string, string>;
  /** The full URL object for the current request */
  url: URL;
  /** The original Request object */
  request: Request;
  /** Helper for deduplicating async calls within a request */
  dedupe: <T>(fn: (...args: any[]) => Promise<T>, ...args: any[]) => Promise<T>;
}

/**
 * A loader function that returns data for a component.
 *
 * Example:
 * ```ts
 * export const load = async (ctx: LoaderContext) => {
 *   const data = await fetch(`/api/posts/${ctx.params.id}`);
 *   return data.json();
 * };
 * ```
 */
export type LoaderFn = (ctx: LoaderContext) => Promise<any>;

/**
 * Internal utility: Extracts the awaited return type of a loader function.
 *
 * @internal - Use `Loader<T>` instead for public API
 */
type LoaderResult<T extends LoaderFn> = T extends (...args: any[]) => infer R
  ? Awaited<R>
  : never;

/**
 * Extracts the awaited return type of a loader function.
 *
 * Usage:
 * ```ts
 * export const load = async () => ({ name: 'James', age: 38 });
 *
 * type Data = Loader<typeof load>;
 * // Data is { name: string; age: number }
 *
 * const data = getData<Data>(Astro, import.meta.url);
 * ```
 */
export type Loader<T extends LoaderFn> = LoaderResult<T>;
