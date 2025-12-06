import { Glob } from "bun";
import { resolve, join } from "path";
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
import { downloadRepo, extractRepo } from "./repo";
import eventTransformer from "./transformers/event";
import { formatCode, saveDeclarationFile } from "./utils";

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

const hookTransformer = () => {};

const pipelineMap = {
  event: { parser: parseEventFile, transformer: eventTransformer },
  hook: { parser: parseHookFile, transformer: hookTransformer },
  library: { parser: parseLibraryFile, generator: generateClassFile },
  enum: { parser: parseEnumFile, generator: generateEnumFile },
  class: { parser: parseClassFile, generator: generateClassFile },
};

const pathPrefix = ".cache/extracted/VU-Docs-master/types/";

async function buildTypes(docsDir: string) {
  const parseResults = new Map<string, ParseResult<any>>();

  // const globPaths = ["*/type/*.yaml", "*/event/*.yaml", "*/library/*.yaml"];
  const globPaths = ["**/*.yaml"];

  const filePaths = globPaths.flatMap((globPath) => {
    const glob = new Glob(globPath);
    return Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
      join(pathPrefix, file)
    );
  });

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

  // console.log(symbolMaps);

  // transforming step
  Object.entries(declarations).forEach(([ctx, ns]) => {
    for (const filePath of filePaths) {
      const parseResult = parseResults.get(resolveRelPath(filePath))!;
      if (!ns.includes(parseResult.namespace)) continue;

      const pipeline = pipelineMap[parseResult.type];
      if (pipeline === undefined || !pipeline.transformer) continue;

      const { transformer } = pipeline;
      transformer(parseResult, ctx, symbolMaps);
    }
  });

  // console.log(
  //   symbolMaps.client.get("shared\\library\\Events.yaml")!.result.methods[10]
  //     .params
  // );

  // declarations generation step
  Object.entries(symbolMaps).forEach(async ([ctx, symbolMap]) => {
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

    const fullPath = resolve(
      import.meta.dir || __dirname,
      `../typings/${ctx}.d.ts`
    );
    console.log("i am about to save " + fullPath);

    await saveDeclarationFile(fullPath, allCode.join("\n"));
  });

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
function resolveNamespace(filePath: string): typeNamespace {
  if (filePath.match(/VU-Docs-master\\types\\client/i)) return "client";
  if (filePath.match(/VU-Docs-master\\types\\server/i)) return "server";
  if (filePath.match(/VU-Docs-master\\types\\fb/i)) return "fb";
  return "shared";
}
function resolveRelPath(filePath: string): string {
  return filePath.replace(/^.*\\VU-Docs-master\\types\\/i, "");
}
