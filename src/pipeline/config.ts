import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import type { PipelineConfig } from "./interfaces";
import { CACHE_DIR } from "../config";

export function createDefaultConfig(): PipelineConfig {
  return {
    parallel: true,
    batchSize: 50,
    cacheEnabled: true,
    outputDir: resolve(import.meta.dir || __dirname, "../typings"),
    namespaces: ["client", "server", "shared"],
    maxWorkers:
      typeof navigator !== "undefined" && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4,
    incremental: true,
    featureFlags: {
      useLegacyPipeline: false,
      enableParallel: true,
      enableCaching: true,
    },
  };
}

export function createConfigFromOptions(
  options: Partial<PipelineConfig> = {}
): PipelineConfig {
  const defaultConfig = createDefaultConfig();
  return {
    ...defaultConfig,
    ...options,
    featureFlags: {
      ...defaultConfig.featureFlags,
      ...options.featureFlags,
    },
  };
}

export function ensureOutputDir(outputDir: string): void {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
}

export const CACHE_KEY_PREFIX = "vu-ts-pipeline-";
