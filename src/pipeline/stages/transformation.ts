import type {
  PipelineStage,
  PipelineContext,
  TransformationContext,
} from "../interfaces";
import type { ParseResult } from "../../index";
import transformEventFile from "../../transformers/event";
import transformHookFile from "../../transformers/hook";
import transformClassFile from "../../transformers/class";
import { resolveRelPath } from "../utils/paths";

const pipelineMap = {
  event: { transformer: transformEventFile },
  hook: { transformer: transformHookFile },
  class: { transformer: transformClassFile },
};

export class TransformationStage
  implements
    PipelineStage<
      ParseResult<any>[],
      Record<string, Map<string, ParseResult<any>>>
    >
{
  async process(
    parseResults: ParseResult<any>[],
    context: PipelineContext
  ): Promise<Record<string, Map<string, ParseResult<any>>>> {
    const symbolMaps = this.createSymbolMaps(parseResults);
    const declarations = this.getDeclarations();

    // Transform each context
    for (const [ctx, namespaces] of Object.entries(declarations)) {
      const transformContext: TransformationContext = {
        ...context,
        symbolMaps,
        currentFile: "",
      };

      const symbolMap = symbolMaps[ctx];
      for (const [key, parseResult] of symbolMap.entries()) {
        transformContext.currentFile = key;

        try {
          await this.transformParseResult(
            parseResult,
            ctx,
            namespaces,
            transformContext
          );
        } catch (error) {
          context.logger.warn(`Failed to transform ${key}: ${error}`);
        }
      }
    }

    return symbolMaps;
  }

  private createSymbolMaps(
    parseResults: ParseResult<any>[]
  ): Record<string, Map<string, ParseResult<any>>> {
    const declarations = this.getDeclarations();

    return Object.entries(declarations).reduce<
      Record<string, Map<string, ParseResult<any>>>
    >((acc, [name, namespaces]) => {
      const m = new Map();
      for (const parseResult of parseResults) {
        const key = resolveRelPath(parseResult.filePath);
        if (!namespaces.includes(parseResult.namespace)) continue;

        // Deep copy to avoid mutations
        m.set(key, JSON.parse(JSON.stringify(parseResult)));
      }

      return {
        ...acc,
        [name]: m,
      };
    }, {});
  }

  private async transformParseResult(
    parseResult: ParseResult<any>,
    ctx: string,
    namespaces: string[],
    transformContext: TransformationContext
  ): Promise<void> {
    if (!namespaces.includes(parseResult.namespace)) return;

    const transformer = this.getTransformer(parseResult.type);
    if (!transformer) return;

    transformer(parseResult, ctx, transformContext.symbolMaps);
  }

  private getTransformer(type: string) {
    const pipeline = pipelineMap[type as keyof typeof pipelineMap];
    return pipeline?.transformer || null;
  }

  private getDeclarations() {
    return {
      client: ["client", "fb", "shared"],
      server: ["server", "fb", "shared"],
      shared: ["fb", "shared"],
    };
  }
}
