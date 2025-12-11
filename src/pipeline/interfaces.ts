import type { ParseResult } from "../index";

export type typeNamespace = "client" | "server" | "shared" | "fb";

export interface PipelineContext {
  logger: Logger;
  config: PipelineConfig;
  metadata: Map<string, any>;
  cache: CacheProvider;
}

export interface PipelineConfig {
  parallel: boolean;
  batchSize: number;
  cacheEnabled: boolean;
  outputDir: string;
  namespaces: string[];
  maxWorkers: number;
  incremental: boolean;
  featureFlags: {
    useLegacyPipeline: boolean;
    enableParallel: boolean;
    enableCaching: boolean;
  };
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface PipelineStage<TInput, TOutput> {
  process(data: TInput, context: PipelineContext): Promise<TOutput>;
  validateInput?(data: TInput): boolean;
  validateOutput?(data: TOutput): boolean;
}

export interface FileMetadata {
  path: string;
  size: number;
  modifiedTime: number;
  hash: string;
  type: string;
  namespace: typeNamespace;
}

export interface TransformationContext extends PipelineContext {
  symbolMaps: Record<string, Map<string, ParseResult<any>>>;
  currentFile: string;
}
