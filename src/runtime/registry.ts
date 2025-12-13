import { AsyncLocalStorage } from 'node:async_hooks';
import type { LoaderFn } from './types.js';

// Request-scoped storage for loader registrations
const requestStorage = new AsyncLocalStorage<Map<string, LoaderFn>>();

/**
 * Register a loader function for a component.
 * This is called automatically by the Vite plugin when a component is imported.
 * Uses AsyncLocalStorage to ensure loaders are scoped to the current request.
 */
export function registerLoader(moduleUrl: string, loader: LoaderFn) {
  const registry = requestStorage.getStore();
  
  if (!registry) {
    // No active request context - this can happen during build or initial imports
    // We'll skip registration and let components register during actual requests
    return;
  }
  
  registry.set(moduleUrl, loader);
}

/**
 * Get the current request's loader registry.
 */
export function getRegistry(): Map<string, LoaderFn> {
  const registry = requestStorage.getStore();
  
  if (!registry) {
    // Return empty map if no active request
    return new Map();
  }
  
  return registry;
}

/**
 * Initialize a new request-scoped registry.
 * This should be called at the start of each request (in middleware).
 */
export function initializeRequestRegistry<T>(callback: () => T): T {
  const registry = new Map<string, LoaderFn>();
  return requestStorage.run(registry, callback);
}
