import { resolve, join } from "path";
import { cwd } from "process";
import type { PipelineStage, PipelineContext } from "../interfaces";
import type { ParseResult } from "../../index";
import generateClassFile from "../../generators/class";
import generateEnumFile from "../../generators/enum";
import { formatCode, saveDeclarationFile } from "../../utils";
import { ensureOutputDir } from "../config";

const pipelineMap = {
  library: { generator: generateClassFile },
  enum: { generator: generateEnumFile },
  class: { generator: generateClassFile },
};

export class GenerationStage
  implements PipelineStage<Record<string, Map<string, ParseResult<any>>>, void>
{
  async process(
    symbolMaps: Record<string, Map<string, ParseResult<any>>>,
    context: PipelineContext
  ): Promise<void> {
    // Determine output directory based on context metadata
    const generateTemplate = context.metadata.get("generateTemplate") as
      | boolean
      | undefined;
    const modName = context.metadata.get("modName") as string | undefined;
    const outputDir = context.metadata.get("outputDir") as string | undefined;

    let typingsBaseDir: string;
    if (generateTemplate && modName) {
      // For template generation, put types directly in the project's typings folder
      const projectFolder = outputDir
        ? join(resolve(outputDir), modName)
        : join(cwd(), modName);
      typingsBaseDir = join(projectFolder, "typings");
    } else if (outputDir) {
      typingsBaseDir = resolve(outputDir);
    } else {
      typingsBaseDir = context.config.outputDir;
    }

    // Ensure output directory exists
    ensureOutputDir(typingsBaseDir);

    // Generate declarations for each namespace
    const namespaces = ["client", "server", "shared"];
    const generationTasks = namespaces.map((namespace) =>
      this.generateNamespace(
        namespace,
        symbolMaps[namespace],
        typingsBaseDir,
        context
      )
    );

    await Promise.all(generationTasks);
  }

  private async generateNamespace(
    namespace: string,
    symbolMap: Map<string, ParseResult<any>>,
    typingsBaseDir: string,
    context: PipelineContext
  ): Promise<void> {
    const allCode: string[] = [];
    const errors: Error[] = [];

    for (const [key, parseResult] of symbolMap.entries()) {
      try {
        const code = await this.generateCodeForParseResult(
          parseResult,
          context
        );
        if (code !== null) {
          allCode.push(code);
        }
      } catch (error) {
        errors.push(error as Error);
        context.logger.warn(`Failed to generate code for ${key}: ${error}`);
      }
    }

    if (errors.length > 0) {
      context.logger.warn(`Failed to generate ${errors.length} files`);
    }

    // Combine and save the final declaration file
    const fullPath = resolve(typingsBaseDir, `${namespace}.d.ts`);
    let finalCode = allCode.join("\n");

    // Include patch content for shared.d.ts
    if (namespace === "shared") {
      const patchContent = await this.getPatchContent();
      finalCode = patchContent + "\n\n" + finalCode;
    }

    await saveDeclarationFile(fullPath, finalCode);
    const outputDir = context.metadata.get("outputDir") as string | undefined;
    const relativePath = outputDir
      ? `${outputDir}/${namespace}.d.ts`
      : `typings/${namespace}.d.ts`;
    context.logger.info(`   ✓ Generated ${relativePath}`);
  }

  private async generateCodeForParseResult(
    parseResult: ParseResult<any>,
    context: PipelineContext
  ): Promise<string | null> {
    const generator = this.getGenerator(parseResult.type);
    if (!generator) {
      // Skip types without generators (events and hooks are transformed but not generated)
      return null;
    }

    const code = generator(parseResult.result);
    return formatCode(code);
  }

  private getGenerator(type: string) {
    const pipeline = pipelineMap[type as keyof typeof pipelineMap];
    return pipeline?.generator || null;
  }

  private async getPatchContent(): Promise<string> {
    const patchPath = resolve(
      import.meta.dir || __dirname,
      "../../patches/shared.d.ts"
    );
    return await Bun.file(patchPath).text();
  }
}
