import { Glob } from "bun";
import { resolve, join } from "path";
import { mkdirSync, existsSync, rmSync } from "fs";
import { cwd } from "process";
import YAML from "yaml";
import {
  REPO_ZIP_DL_DIR,
  REPO_ZIP_EXTRACT_DIR,
  VU_DOCS_REPO_URL,
} from "./config";
import generateClassFile from "./generators/class";
import generateEnumFile from "./generators/enum";
import parseClassFile from "./parsers/class";
import parseEnumFile from "./parsers/enum";
import parseEventFile from "./parsers/event";
import parseHookFile from "./parsers/hook";
import parseLibraryFile from "./parsers/library";
import { downloadRepo, extractRepo, getLatestCommitHash } from "./repo";
import eventTransformer from "./transformers/event";
import hookTransformer from "./transformers/hook";
import classTransformer from "./transformers/class";
import { formatCode, saveDeclarationFile } from "./utils";
import type { RawClassFile } from "./types/generated/RawClassFile";
import type { RawEnumFile } from "./types/generated/RawEnumFile";
import type { RawEventFile } from "./types/generated/RawEventFile";
import type { RawHookFile } from "./types/generated/RawHookFile";
import type { RawLibraryFile } from "./types/generated/RawLibraryFile";
import generateExtProject, {
  checkTemplateFolderExists,
  getTemplateFolderPath,
} from "./generators/ext-project";

type typeNamespace = "client" | "server" | "shared" | "fb";

export type ParseResult<T extends unknown> = {
  filePath: string;
  type: string;
  namespace: typeNamespace;
  result: T;
};

async function readYamlData(filePath: string) {
  const contents = await Bun.file(filePath).text();
  return YAML.parse(contents);
}

const pipelineMap = {
  event: { parser: parseEventFile, transformer: eventTransformer },
  hook: { parser: parseHookFile, transformer: hookTransformer },
  library: { parser: parseLibraryFile, generator: generateClassFile },
  enum: { parser: parseEnumFile, generator: generateEnumFile },
  class: {
    parser: parseClassFile,
    transformer: classTransformer,
    generator: generateClassFile,
  },
};

export interface MainOptions {
  outputDir?: string;
  generateTemplate?: boolean;
  modName?: string;
  rm?: boolean;
  refresh?: boolean;
}

async function buildTypes(
  docsDir: string,
  outputDir?: string,
  generateTemplate?: boolean,
  templateTypingsDir?: string,
  modName?: string
) {
  const parseResults = new Map<string, ParseResult<any>>();

  // Construct the path to the types directory from docsDir
  // docsDir is the extraction directory, which contains VU-Docs-master/types/
  const pathPrefix = join(docsDir, "VU-Docs-master", "types");

  // const globPaths = ["*/type/*.yaml", "*/event/*.yaml", "*/library/*.yaml"];
  const globPaths = ["**/*.yaml"];

  const filePaths = globPaths.flatMap((globPath) => {
    const glob = new Glob(globPath);
    return Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
      join(pathPrefix, file)
    );
  });

  console.log(`   Parsing ${filePaths.length} YAML files...`);

  // parsing step
  for (const filePath of filePaths) {
    const yamlData = await readYamlData(filePath);

    const pipeline = pipelineMap[yamlData.type];
    if (pipeline === undefined) continue;

    // Type-check: Cast YAML data to appropriate Raw*File type
    // The parsers will handle the actual transformation
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
        continue;
    }

    const { parser } = pipeline;
    const parseResult = parser(rawData);

    const result = {
      filePath: filePath,
      type: yamlData.type,
      namespace: resolveNamespace(filePath),
      result: parseResult,
    } as ParseResult<any>;

    parseResults.set(resolveRelPath(filePath), result);
  }

  // create different maps per namespace
  const declarations = {
    client: ["client", "fb", "shared"],
    server: ["server", "fb", "shared"],
    shared: ["fb", "shared"],
  };

  const symbolMaps = Object.entries(declarations).reduce<
    Record<string, Map<string, ParseResult<any>>>
  >((acc, [name, tests]) => {
    const m = new Map();
    for (const key of parseResults.keys()) {
      const value = parseResults.get(key);
      if (value === undefined || !tests.includes(value.namespace)) continue;

      m.set(key, JSON.parse(JSON.stringify(value)));
    }

    return {
      ...acc,
      [name]: m,
    };
  }, {});

  // transforming step - apply to symbol maps so changes are visible to generators
  Object.entries(declarations).forEach(([ctx, ns]) => {
    const symbolMap = symbolMaps[ctx];
    for (const [key, parseResult] of symbolMap.entries()) {
      if (!ns.includes(parseResult.namespace)) continue;

      const pipeline = pipelineMap[parseResult.type];
      if (pipeline === undefined || !pipeline.transformer) continue;

      const { transformer } = pipeline;
      transformer(parseResult, ctx, symbolMaps);
    }
  });

  // console.log(symbolMaps);

  // console.log(
  //   symbolMaps.client.get("shared\\library\\Events.yaml")!.result.methods[10]
  //     .params
  // );

  // declarations generation step
  // When generating a template, types go directly to the project's typings folder
  // Otherwise, types go to the specified outputDir or default location
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
    typingsBaseDir = resolve(import.meta.dir || __dirname, "../typings");
  }

  // Ensure output directory exists
  if (!existsSync(typingsBaseDir)) {
    mkdirSync(typingsBaseDir, { recursive: true });
  }

  for (const [ctx, symbolMap] of Object.entries(symbolMaps)) {
    const allCode: string[] = [];
    for (const key of symbolMap.keys()) {
      const parseResult = symbolMap.get(key)!;

      const pipeline = pipelineMap[parseResult.type];
      if (pipeline === undefined || !pipeline.generator) continue;

      const { generator } = pipeline;
      const code = generator(parseResult.result);

      // console.log(formatCode(code));
      allCode.push(formatCode(code));

      // const matches = parseResult.filePath.match(
      //   /VU-Docs-master\\types\\(.*)\.yaml$/i
      // );
      // const relPath = matches![1];
      // const fullPath = resolve(__dirname, `../typings/${relPath}.d.ts`);
      // await saveDeclarationFile(fullPath, code);
    }

    const fullPath = resolve(typingsBaseDir, `${ctx}.d.ts`);

    // Include patch content for shared.d.ts
    let finalCode = allCode.join("\n");
    if (ctx === "shared") {
      const patchPath = resolve(
        import.meta.dir || __dirname,
        "./patches/shared.d.ts"
      );
      const patchContent = await Bun.file(patchPath).text();
      finalCode = patchContent + "\n\n" + finalCode;
    }

    await saveDeclarationFile(fullPath, finalCode);
    const relativePath = outputDir
      ? `${outputDir}/${ctx}.d.ts`
      : `typings/${ctx}.d.ts`;
    console.log(`   ✓ Generated ${relativePath}`);
  }

  // console.log(parseResults);

  // results.forEach(async (result) => {
  //   const matches = result.path.match(/VU-Docs-master\\types\\(.*)\.yaml$/i);
  //   const relPath = matches![1];
  //   const fullPath = resolve(__dirname, `../typings/${relPath}.d.ts`);

  //   await saveDeclarationFile(fullPath, result.source);
  // });
}

export async function main(options: MainOptions = {}) {
  const {
    outputDir,
    generateTemplate = false,
    modName,
    rm = false,
    refresh = false,
  } = options;

  // Pre-flight check: if generating template, validate project folder doesn't exist
  if (generateTemplate && modName && !refresh && !rm) {
    const { checkTemplateFolderExists } = await import(
      "./generators/ext-project"
    );
    if (checkTemplateFolderExists(modName, outputDir)) {
      const folderPath = outputDir ? `${outputDir}/${modName}` : modName;
      throw new Error(
        `Folder "${folderPath}" already exists!\nUse --force to overwrite, or --refresh to update while preserving code.`
      );
    }
  }

  // Handle refresh mode - expect output directories to exist
  if (refresh) {
    const typingsBaseDir = outputDir
      ? resolve(outputDir)
      : resolve(import.meta.dir || __dirname, "../typings");

    if (!existsSync(typingsBaseDir)) {
      console.error(
        `\n❌ Error: Output directory does not exist: ${typingsBaseDir}`
      );
      console.error(
        `   --refresh requires the output directory to already exist.`
      );
      process.exit(1);
    }

    if (generateTemplate) {
      const templateFolderPath = getTemplateFolderPath(modName, outputDir);
      if (!existsSync(templateFolderPath)) {
        console.error(
          `\n❌ Error: Template folder does not exist: ${templateFolderPath}`
        );
        console.error(
          `   --refresh requires the template folder to already exist.`
        );
        process.exit(1);
      }
      console.log(
        `🔄 Refresh mode: Will overwrite files while preserving __init__.ts files`
      );
    } else {
      console.log(`🔄 Refresh mode: Will overwrite type definition files`);
    }
  }

  // If rm flag is set, remove existing folder (CLI service has already validated this)
  if (generateTemplate && rm && modName) {
    const templateFolderPath = getTemplateFolderPath(modName, outputDir);
    console.log(`🗑️  Removing existing folder "${templateFolderPath}"...`);
    rmSync(templateFolderPath, { recursive: true, force: true });
    console.log(`   ✓ Removed existing folder`);
  }

  console.log("🚀 Starting VU TypeScript type generation...\n");

  // Get latest commit hash once at the start
  console.log("📡 Checking repository status...");
  const commitHash = await getLatestCommitHash();
  if (commitHash) {
    console.log(`   Latest commit: ${commitHash.substring(0, 7)}\n`);
  } else {
    console.log("   (Using fallback cache check)\n");
  }

  // Always generate types first
  console.log("📦 Repository sync:");
  await downloadRepo(VU_DOCS_REPO_URL, REPO_ZIP_DL_DIR, commitHash);
  await extractRepo(REPO_ZIP_DL_DIR, REPO_ZIP_EXTRACT_DIR, commitHash);

  // For template generation, types will be generated by the generateExtProject function
  // Don't pre-cculate templateTypingsDir here to avoid creating the parent folder prematurely
  let templateTypingsDir: string | undefined;

  console.log("\n🔨 Generating type definitions...");
  await buildTypes(
    REPO_ZIP_EXTRACT_DIR,
    outputDir,
    generateTemplate,
    templateTypingsDir,
    modName
  );

  // If generateTemplate is true, also generate the ext project
  if (generateTemplate) {
    console.log("\n📁 Generating mod template...");
    await generateExtProject(modName, refresh, outputDir);
  }

  console.log("\n✅ Done!");
}
function resolveNamespace(filePath: string): typeNamespace {
  // Handle both Windows (\) and Unix (/) path separators
  if (filePath.match(/VU-Docs-master[\\/]types[\\/]client/i)) return "client";
  if (filePath.match(/VU-Docs-master[\\/]types[\\/]server/i)) return "server";
  if (filePath.match(/VU-Docs-master[\\/]types[\\/]fb/i)) return "fb";
  return "shared";
}
function resolveRelPath(filePath: string): string {
  // Handle both Windows (\) and Unix (/) path separators
  return filePath.replace(/^.*[\\/]VU-Docs-master[\\/]types[\\/]/i, "");
}
