export { PipelineFactory, Pipeline } from "./factory";
export { DiscoveryStage } from "./stages/discovery";
export { ParsingStage } from "./stages/parsing";
export { TransformationStage } from "./stages/transformation";
export { GenerationStage } from "./stages/generation";
export type {
  PipelineContext,
  PipelineConfig,
  PipelineStage,
  FileMetadata,
  TransformationContext,
} from "./interfaces";
export type {
  ProcessingStats,
  BatchResult,
  StreamProcessor,
  PipelineStageType,
} from "./types";
export {
  createDefaultConfig,
  createConfigFromOptions,
  ensureOutputDir,
  CACHE_KEY_PREFIX,
} from "./config";
export { createPipelineContext } from "./context";
export { FeatureFlags } from "./config/feature-flags";
export { LegacyPipelineWrapper } from "./legacy-wrapper";
