import type {
  PipelineStage,
  PipelineContext,
  FileMetadata,
} from "../interfaces";
import { readYamlData } from "../utils/yaml";
import { calculateFileHash } from "../utils/file-hash";
import { resolveNamespace } from "../utils/paths";

export class DiscoveryStage implements PipelineStage<string[], FileMetadata[]> {
  readonly batchSize = 100;
  readonly pathPrefix = ".cache/extracted/VU-Docs-master/types/";

  async process(
    filePaths: string[],
    context: PipelineContext
  ): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    // Process files in batches
    for (let i = 0; i < filePaths.length; i += this.batchSize) {
      const batch = filePaths.slice(i, i + this.batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((filePath) => this.processFile(filePath, context))
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          files.push(result.value);
        } else {
          context.logger.warn(
            `Failed to process file metadata: ${result.reason}`
          );
        }
      }
    }

    return files;
  }

  private async processFile(
    filePath: string,
    context: PipelineContext
  ): Promise<FileMetadata> {
    const stat = await Bun.file(filePath).stat();
    const hash = await calculateFileHash(filePath);
    const yamlData = await readYamlData(filePath);
    const namespace = resolveNamespace(filePath);

    return {
      path: filePath,
      size: stat.size,
      modifiedTime: stat.mtime.getTime(),
      hash,
      type: yamlData.type,
      namespace,
    };
  }
}
