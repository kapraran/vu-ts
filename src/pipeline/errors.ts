export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly stage: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export class StageValidationError extends PipelineError {
  constructor(stage: string, message: string, cause?: Error) {
    super(`Stage validation failed in ${stage}: ${message}`, stage, cause);
    this.name = "StageValidationError";
  }
}

export class StageProcessingError extends PipelineError {
  constructor(stage: string, message: string, cause?: Error) {
    super(`Stage processing failed in ${stage}: ${message}`, stage, cause);
    this.name = "StageProcessingError";
  }
}

export function handleStageError(stage: string, error: unknown): PipelineError {
  if (error instanceof PipelineError) {
    return error;
  }

  if (error instanceof Error) {
    return new StageProcessingError(stage, error.message, error);
  }

  return new StageProcessingError(stage, String(error));
}
