import { readFile } from "fs-extra";
import { globSync } from "glob";
import YAML from "yaml";
import {
  REPO_ZIP_DL_DIR,
  REPO_ZIP_EXTRACT_DIR,
  VU_DOCS_REPO_URL,
} from "./config";
import generateEnumFile from "./generators/enum";
import generateLibraryFile from "./generators/library";
import parseEnumFile from "./parsers/enum";
import parseEventFile from "./parsers/event";
import parseLibraryFile from "./parsers/library";
import { downloadRepo, extractRepo } from "./repo";
import eventTransformer from "./transformers/event";

export type ParseResult<T extends unknown> = {
  filePath: string;
  type: string;
  namespace: "client" | "server" | "shared";
  result: T;
};

async function readYamlData(filePath: string) {
  const contents = await readFile(filePath, "utf8");
  return YAML.parse(contents);
}

const pipelineMap = {
  event: { parser: parseEventFile, transformer: eventTransformer },
  library: { parser: parseLibraryFile, generator: generateLibraryFile },
  enum: { parser: parseEnumFile, generator: generateEnumFile },
};

const pathPrefix = ".cache/extracted/VU-Docs-master/types/";

async function buildTypes(docsDir: string) {
  const parseResults = new Map<string, ParseResult<any>>();

  const globPaths = ["*/event/*.yaml", "*/library/*.yaml"];

  const filePaths = globPaths.flatMap((globPath) =>
    globSync(pathPrefix + globPath)
  );

  // parsing step
  for (const filePath of filePaths) {
    const data = await readYamlData(filePath);

    const pipeline = pipelineMap[data.type];
    if (pipeline === undefined) continue;

    const { parser } = pipeline;
    const parseResult = parser(data);

    const result = {
      filePath: filePath,
      type: data.type,
      namespace: resolveNamespace(filePath),
      result: parseResult,
    } as ParseResult<any>;

    parseResults.set(resolveRelPath(filePath), result);
  }

  // create different maps per namespace
  const declarations = {
    client: [/^client/i, /^fb/i, /^shared/i],
    server: [/^server/i, /^fb/i, /^shared/i],
    shared: [/^fb/i, /^shared/i],
  };

  const symbolMaps = Object.entries(declarations).reduce(
    (acc, [name, tests]) => {
      const m = new Map();
      for (const key of parseResults.keys()) {
        if (!tests.some((t) => key.match(t))) continue;

        const value = parseResults.get(key);
        m.set(key, JSON.parse(JSON.stringify(value)));
      }

      return {
        ...acc,
        [name]: m,
      };
    },
    {}
  );

  // console.log(symbolMaps);

  // transforming step
  for (const filePath of filePaths) {
    const parseResult = parseResults.get(resolveRelPath(filePath))!;
    const pipeline = pipelineMap[parseResult.type];
    if (pipeline === undefined || !pipeline.transformer) continue;

    const { transformer } = pipeline;
    transformer(parseResult, symbolMaps);
  }

  console.log(
    symbolMaps.shared.get("shared\\library\\Events.yaml").result.methods
  );

  // declarations generation step

  // console.log(parseResults);

  // results.forEach(async (result) => {
  //   const matches = result.path.match(/VU-Docs-master\\types\\(.*)\.yaml$/i);
  //   const relPath = matches![1];
  //   const fullPath = resolve(__dirname, `../typings/${relPath}.d.ts`);

  //   await saveDeclarationFile(fullPath, result.source);
  // });

  console.log("the-end");
}

async function main() {
  await downloadRepo(VU_DOCS_REPO_URL, REPO_ZIP_DL_DIR);
  await extractRepo(REPO_ZIP_DL_DIR, REPO_ZIP_EXTRACT_DIR);
  await buildTypes(REPO_ZIP_EXTRACT_DIR);
}

main();
function resolveNamespace(filePath: string): "client" | "server" | "shared" {
  if (filePath.match(/VU-Docs-master\\types\\client/i)) return "client";
  if (filePath.match(/VU-Docs-master\\types\\server/i)) return "server";
  return "shared";
}
function resolveRelPath(filePath: string): string {
  return filePath.replace(/^.*\\VU-Docs-master\\types\\/i, "");
}
