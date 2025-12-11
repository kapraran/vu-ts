import type { PipelineContext, PipelineConfig } from "./interfaces";
import { createLogger } from "./utils/logger";
import { createCacheProvider } from "./utils/cache";

export function createPipelineContext(config: PipelineConfig): PipelineContext {
  return {
    logger: createLogger(),
    config,
    metadata: new Map(),
    cache: createCacheProvider(),
  };
}
