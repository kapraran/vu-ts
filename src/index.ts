import { readFile } from "fs-extra";
import { globSync } from "glob";
import YAML from "yaml";
import {
  REPO_ZIP_DL_DIR,
  REPO_ZIP_EXTRACT_DIR,
  VU_DOCS_REPO_URL,
} from "./config";
import generateEnumFile from "./generators/enum";
import generateEventFile from "./generators/event";
import generateLibraryFile from "./generators/library";
import parseEnumFile from "./parsers/enum";
import parseEventFile from "./parsers/event";
import parseLibraryFile from "./parsers/library";
import { downloadRepo, extractRepo } from "./repo";

type ParseResult = {
  path: string;
  namespace: "client" | "server" | "shared";
  result: unknown;
};

async function readYamlData(filePath: string) {
  const contents = await readFile(filePath, "utf8");
  return YAML.parse(contents);
}

const pipelineMap = {
  event: [parseEventFile, generateEventFile],
  library: [parseLibraryFile, generateLibraryFile],
  enum: [parseEnumFile, generateEnumFile],
};

const pathPrefix = ".cache/extracted/VU-Docs-master/types/";

async function buildTypes(docsDir: string) {
  // const typeDirs = ["client/type", "server/type", "shared/type", "fb"];
  // const typeDirs = ["client/library", "server/library", "shared/library"];
  const typeDirs = ["client/event", "server/event", "shared/event"];
  // const typeDirs = ["server/type"];

  const parseResults = new Map<string, ParseResult>();

  const globPaths = ["*/event/*.yaml"];

  const filePaths = globPaths.flatMap((globPath) =>
    globSync(pathPrefix + globPath)
  );

  for (const filePath of filePaths) {
    const data = await readYamlData(filePath);

    const pipeline = pipelineMap[data.type];
    if (pipeline === undefined) continue;

    const [parser, generator] = pipeline;
    const parserResult = parser(data);

    const result = {
      path: filePath,
      namespace: resolveNamespace(filePath),
      result: parserResult,
    } as ParseResult;

    parseResults.set(filePath, result);
  }

  console.log(parseResults);

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
