import type {
  PipelineStage,
  PipelineContext,
  FileMetadata,
} from "../interfaces";
import type { ParseResult } from "../../index";
import parseClassFile from "../../parsers/class";
import parseEnumFile from "../../parsers/enum";
import parseEventFile from "../../parsers/event";
import parseHookFile from "../../parsers/hook";
import parseLibraryFile from "../../parsers/library";
import { resolveRelPath, resolveNamespace } from "../utils/paths";
import { readYamlData } from "../utils/yaml";
import type { RawClassFile } from "../../types/generated/RawClassFile";
import type { RawEnumFile } from "../../types/generated/RawEnumFile";
import type { RawEventFile } from "../../types/generated/RawEventFile";
import type { RawHookFile } from "../../types/generated/RawHookFile";
import type { RawLibraryFile } from "../../types/generated/RawLibraryFile";

const pipelineMap = {
  event: { parser: parseEventFile },
  hook: { parser: parseHookFile },
  library: { parser: parseLibraryFile },
  enum: { parser: parseEnumFile },
  class: { parser: parseClassFile },
};

export class ParsingStage
  implements PipelineStage<FileMetadata[], ParseResult<any>[]>
{
  async process(
    files: FileMetadata[],
    context: PipelineContext
  ): Promise<ParseResult<any>[]> {
    const results: ParseResult<any>[] = [];
    const errors: Array<{ file: FileMetadata; error: Error }> = [];

    // Create batches for parallel processing
    const batches = this.createBatches(files, context.config.batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map((file) => this.parseFile(file, context))
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          const error = result.reason as Error;
          const file = batch.find((f) => error.message.includes(f.path));
          if (file) {
            errors.push({ file, error });
            context.logger.warn(
              `Failed to parse ${file.path}: ${error.message}`
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      context.logger.warn(`Failed to parse ${errors.length} files`);
    }

    return results;
  }

  private async parseFile(
    file: FileMetadata,
    context: PipelineContext
  ): Promise<ParseResult<any>> {
    const yamlData = await readYamlData(file.path);
    const pipeline = pipelineMap[yamlData.type as keyof typeof pipelineMap];

    if (!pipeline) {
      throw new Error(`No parser found for type: ${yamlData.type}`);
    }

    // Type-check: Cast YAML data to appropriate Raw*File type
    let rawData:
      | RawClassFile
      | RawEnumFile
      | RawEventFile
      | RawHookFile
      | RawLibraryFile;
    switch (yamlData.type) {
      case "class":
        rawData = yamlData as RawClassFile;
        break;
      case "enum":
        rawData = yamlData as RawEnumFile;
        break;
      case "event":
        rawData = yamlData as RawEventFile;
        break;
      case "hook":
        rawData = yamlData as RawHookFile;
        break;
      case "library":
        rawData = yamlData as RawLibraryFile;
        break;
      default:
        throw new Error(`Unknown type: ${yamlData.type}`);
    }

    const parseResult = pipeline.parser(rawData);

    return {
      filePath: file.path,
      type: yamlData.type,
      namespace: resolveNamespace(file.path),
      result: parseResult,
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
