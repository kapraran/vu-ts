import type { PipelineConfig } from "../interfaces";
import { createDefaultConfig } from "../config";

export function createConfigFromEnv(): Partial<PipelineConfig> {
  const config: Partial<PipelineConfig> = {};

  if (typeof process === "undefined" || !process.env) {
    return config;
  }

  // Environment variable overrides
  if (process.env.VU_TS_OUTPUT_DIR) {
    config.outputDir = process.env.VU_TS_OUTPUT_DIR;
  }

  if (process.env.VU_TS_BATCH_SIZE) {
    config.batchSize = parseInt(process.env.VU_TS_BATCH_SIZE, 10);
  }

  if (process.env.VU_TS_MAX_WORKERS) {
    config.maxWorkers = parseInt(process.env.VU_TS_MAX_WORKERS, 10);
  }

  if (process.env.VU_TS_PARALLEL !== undefined) {
    config.parallel = process.env.VU_TS_PARALLEL === "true";
  }

  if (process.env.VU_TS_CACHE_ENABLED !== undefined) {
    config.cacheEnabled = process.env.VU_TS_CACHE_ENABLED === "true";
  }

  if (process.env.VU_TS_INCREMENTAL !== undefined) {
    config.incremental = process.env.VU_TS_INCREMENTAL === "true";
  }

  return config;
}
