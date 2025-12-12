import type { LoaderFn } from './types.js';

const registry = new Map<string, LoaderFn>();

export function registerLoader(moduleUrl: string, loader: LoaderFn) {
  registry.set(moduleUrl, loader);
}

export function getRegistry() {
  return registry;
}
