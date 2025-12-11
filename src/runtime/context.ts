import type { LoaderContext } from './types';
import { createPromiseDedupe } from './dedupe';

/**
 * Creates a loader context object that is passed to all loader functions.
 *
 * This context provides:
 * - params: Route parameters from Astro
 * - url: The full URL object
 * - request: The original Request object
 * - dedupe: A deduplication helper to prevent duplicate async calls
 *
 * Users can extend this by creating their own context factory.
 */
export function createLoaderContext(
  params: Record<string, string>,
  request: Request,
): LoaderContext {
  const url = new URL(request.url);
  const dedupe = createPromiseDedupe();

  return {
    params,
    url,
    request,
    dedupe,
  };
}
