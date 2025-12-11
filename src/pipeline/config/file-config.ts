import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { PipelineConfig } from "../interfaces";
import { createDefaultConfig } from "../config";

export interface ConfigFile {
  pipeline?: {
    parallel?: boolean;
    batchSize?: number;
    cacheEnabled?: boolean;
    maxWorkers?: number;
    incremental?: boolean;
  };
  featureFlags?: {
    useLegacyPipeline?: boolean;
    enableParallel?: boolean;
    enableCaching?: boolean;
  };
  output?: {
    dir?: string;
  };
}

export function loadConfigFromFile(): PipelineConfig {
  const configPath = resolve(process.cwd(), "vu-ts.config.json");
  const configPathTs = resolve(process.cwd(), "vu-ts.config.ts");

  let config: ConfigFile = {};

  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } else if (existsSync(configPathTs)) {
    // For TypeScript config files, we'd need to compile them first
    // For now, we'll skip TypeScript config files
    // In a real implementation, you might use ts-node or similar
  }

  return mergeConfig(config);
}

function mergeConfig(configFile: ConfigFile): PipelineConfig {
  const defaultConfig = createDefaultConfig();

  return {
    parallel: configFile.pipeline?.parallel ?? defaultConfig.parallel,
    batchSize: configFile.pipeline?.batchSize ?? defaultConfig.batchSize,
    cacheEnabled:
      configFile.pipeline?.cacheEnabled ?? defaultConfig.cacheEnabled,
    maxWorkers: configFile.pipeline?.maxWorkers ?? defaultConfig.maxWorkers,
    incremental: configFile.pipeline?.incremental ?? defaultConfig.incremental,
    outputDir: configFile.output?.dir ?? defaultConfig.outputDir,
    namespaces: defaultConfig.namespaces,
    featureFlags: {
      useLegacyPipeline:
        configFile.featureFlags?.useLegacyPipeline ??
        defaultConfig.featureFlags.useLegacyPipeline,
      enableParallel:
        configFile.featureFlags?.enableParallel ??
        defaultConfig.featureFlags.enableParallel,
      enableCaching:
        configFile.featureFlags?.enableCaching ??
        defaultConfig.featureFlags.enableCaching,
    },
  };
}
