import type {
  PipelineStage,
  PipelineContext,
  PipelineConfig,
} from "./interfaces";
import { DiscoveryStage } from "./stages/discovery";
import { ParsingStage } from "./stages/parsing";
import { TransformationStage } from "./stages/transformation";
import { GenerationStage } from "./stages/generation";
import { createConfigFromOptions } from "./config";
import { createLogger } from "./utils/logger";
import { createCacheProvider } from "./utils/cache";

export class PipelineFactory {
  static createStages(context: PipelineContext): PipelineStage<any, any>[] {
    return [
      new DiscoveryStage(),
      new ParsingStage(),
      new TransformationStage(),
      new GenerationStage(),
    ];
  }

  static createContext(config: PipelineConfig): PipelineContext {
    return {
      logger: createLogger(),
      config,
      metadata: new Map(),
      cache: createCacheProvider(),
    };
  }

  static createPipeline(config?: Partial<PipelineConfig>) {
    const finalConfig = createConfigFromOptions(config);
    const context = this.createContext(finalConfig);
    const stages = this.createStages(context);

    return new Pipeline(stages, context);
  }
}

export class Pipeline {
  constructor(
    private stages: PipelineStage<any, any>[],
    private context: PipelineContext
  ) {}

  getContext(): PipelineContext {
    return this.context;
  }

  async run(input: any): Promise<any> {
    let currentInput = input;

    for (const stage of this.stages) {
      this.context.logger.debug(`Running stage: ${stage.constructor.name}`);

      if (stage.validateInput && !stage.validateInput(currentInput)) {
        this.context.logger.warn(
          `Invalid input for stage: ${stage.constructor.name}`
        );
        throw new Error(`Invalid input for stage: ${stage.constructor.name}`);
      }

      currentInput = await stage.process(currentInput, this.context);

      if (stage.validateOutput && !stage.validateOutput(currentInput)) {
        this.context.logger.warn(
          `Invalid output from stage: ${stage.constructor.name}`
        );
      }
    }

    return currentInput;
  }
}
