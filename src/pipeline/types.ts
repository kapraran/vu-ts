export type PipelineStageType =
  | "discovery"
  | "parsing"
  | "transformation"
  | "generation";

export interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  startTime: number;
  endTime?: number;
  memoryUsage: {
    peak: number;
    current: number;
  };
  errors: Error[];
}

export interface BatchResult<T> {
  items: T[];
  errors: Array<{ item: any; error: Error }>;
  stats: ProcessingStats;
}

export interface StreamProcessor<T> {
  process(): AsyncIterable<T>;
  finalize(): Promise<void>;
}
