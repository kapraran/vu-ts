import { readdir, readFile } from "fs-extra";
import { resolve } from "path";
import YAML from "yaml";
import {
  REPO_ZIP_DL_DIR,
  REPO_ZIP_EXTRACT_DIR,
  VU_DOCS_REPO_URL,
} from "./config";
import generateEnumFile from "./generators/enum";
import parseEnumFile from "./parsers/enum";
import { CleanYamlData } from "./parsers/parser";
import { downloadRepo, extractRepo } from "./repo";
import { saveDeclarationFile } from "./utils";

async function readYamlData(filePath: string) {
  const contents = await readFile(filePath, "utf8");
  return YAML.parse(contents);
}

type BuildResult = {
  path: string;
  parseResult: CleanYamlData;
  source: string;
};

const pipelineMap = {
  // library: [parseLibraryFile, generateLibrary],
  enum: [parseEnumFile, generateEnumFile],
};

async function buildTypes(docsDir: string) {
  // get list of all yaml files
  // const docsFilepaths = await getAllDocsFilepaths(docsDir);
  // console.log("TODO buildTypes()");

  const typeDirs = ["client/type", "server/type", "shared/type", "fb"];
  // const typeDirs = ["client/library", "server/library", "shared/library"];
  // const typeDirs = ["server/type"];

  const results: BuildResult[] = [];

  for (const typeDir of typeDirs) {
    const parentDir = resolve(
      __dirname,
      "../.cache/extracted/VU-Docs-master/types/",
      typeDir
    );
    const filesInDir = await readdir(parentDir);

    for (const filename of filesInDir) {
      const p = resolve(parentDir, filename);

      const data = await readYamlData(p);

      let cleanData: CleanYamlData = {
        name: data.name,
        type: data.type,
        constructors: [],
        properties: [],
        operators: [],
        values: [],
        static: [],
        methods: [],
      };

      const pipeline = pipelineMap[data.type];
      if (pipeline === undefined) continue;

      const [parser, generator] = pipeline;
      const code = generator(parser(data)) || "";

      if (code.length > 0) {
        const result: BuildResult = {
          path: p,
          parseResult: cleanData,
          source: code,
        };

        results.push(result);
      } else {
        console.warn(`${p} did not generate any code`);
      }
    }
  }

  results.forEach(async (result) => {
    const matches = result.path.match(/VU-Docs-master\\types\\(.*)\.yaml$/i);
    const relPath = matches![1];
    const fullPath = resolve(__dirname, `../typings/${relPath}.d.ts`);

    await saveDeclarationFile(fullPath, result.source);
  });

  console.log("the-end");
}

async function main() {
  await downloadRepo(VU_DOCS_REPO_URL, REPO_ZIP_DL_DIR);
  await extractRepo(REPO_ZIP_DL_DIR, REPO_ZIP_EXTRACT_DIR);
  await buildTypes(REPO_ZIP_EXTRACT_DIR);
}

main();
