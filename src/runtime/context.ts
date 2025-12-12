import type { LoaderContext } from './types';
import { promiseDedupe } from './dedupe';

interface LoaderContextOptions {
  params: Record<string, string>;
  request: Request;
  extend?: () => Record<string, any>;
}

/**
 * Creates a loader context object that is passed to all loader functions.
 *
 * This context provides:
 * - params: Route parameters from Astro
 * - url: The full URL object
 * - request: The original Request object
 * - dedupe: A deduplication helper to prevent duplicate async calls
 * - extend: A function to add custom properties while keeping all required fields.
 */
export function createLoaderContext(options: LoaderContextOptions): LoaderContext {
  const { params, request, extend } = options;
  const url = new URL(request.url);
  const dedupe = promiseDedupe();

  const context: LoaderContext = {
    params,
    url,
    request,
    dedupe,
  };

  if (extend) {
    Object.assign(context, extend());
  }

  return context;
}
