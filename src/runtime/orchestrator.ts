import { getRegistry } from './registry';
import { createLoaderContext } from './context';
import type { LoaderContext } from './types';

export interface OrchestratorResult {
  context: LoaderContext;
  dataByModule: Map<string, unknown>;
}

export interface RunAllLoadersOptions {
  params: Record<string, string>;
  request: Request;
  extend?: () => Record<string, any>;
}

export async function runAllLoadersForRequest(
  options: RunAllLoadersOptions,
): Promise<OrchestratorResult> {
  const { params, request, extend } = options;

  const context = createLoaderContext({ params, request, extend });
  const registry = getRegistry();

  const entries = Array.from(registry.entries());

  const results = await Promise.all(
    entries.map(async ([moduleUrl, loader]) => {
      const value = await loader(context);
      return [moduleUrl, value] as const;
    }),
  );

  const dataByModule = new Map<string, unknown>(results);

  return {
    context,
    dataByModule,
  };
}
