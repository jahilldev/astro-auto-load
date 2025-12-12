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
  dedupe: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
}

/**
 * A loader function that returns data for a component.
 *
 * Example:
 * ```ts
 * export const loader = async (context: LoaderContext) => {
 *   const data = await fetch(`/api/posts/${context.params.id}`);
 *   return data.json();
 * };
 * ```
 */
export type LoaderFn = (context: LoaderContext) => Promise<any>;

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
 * export const loader = async () => ({ name: 'James', age: 38 });
 *
 * type Data = Loader<typeof loader>;
 * // Data is { name: string; age: number }
 *
 * const data = getLoaderData<Data>(Astro, import.meta.url);
 * ```
 */
export type Loader<T extends LoaderFn> = LoaderResult<T>;
