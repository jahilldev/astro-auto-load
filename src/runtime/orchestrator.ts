import { getRegistry } from './registry';
import { createLoaderContext } from './context';
import type { LoaderContext } from './types';

export interface OrchestratorResult {
  context: LoaderContext;
  dataByModule: Map<string, unknown>;
}

export async function runAllLoadersForRequest(
  params: Record<string, string>,
  request: Request,
): Promise<OrchestratorResult> {
  const context: LoaderContext = createLoaderContext({ params, request });
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
