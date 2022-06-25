import { parseTypeFile, YamlData } from "./parser";
import {
  REPO_ZIP_DL_DIR,
  REPO_ZIP_EXTRACT_DIR,
  VU_DOCS_REPO_URL,
} from "./config";
import { downloadRepo, extractRepo } from "./repo";
import { resolve } from "path";
import { readdir, readFile, writeFile } from "fs-extra";
import yaml from "js-yaml";
import { generateClass, generateEnum } from "./generator";

async function readYamlData(filePath: string) {
  const contents = await readFile(filePath, "utf8");
  return yaml.load(contents) as YamlData;
}

async function buildTypes(docsDir: string) {
  // get list of all yaml files
  // const docsFilepaths = await getAllDocsFilepaths(docsDir);
  // console.log("TODO buildTypes()");

  // const typeDirs = ["client/type", "server/type", "shared/type", "fb"];
  const typeDirs = ["server/type"];

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

      const cleanData = parseTypeFile(data);

      let code = "";
      if (cleanData.type === "class") code = generateClass(cleanData);
      if (cleanData.type === "enum") code = generateEnum(cleanData);

      if (code.length > 0) {
        const p2 = p.replace(".yaml", ".d.ts");
        await writeFile(p2, code, "utf8");
      }
    }
  }
}

async function main() {
  await downloadRepo(VU_DOCS_REPO_URL, REPO_ZIP_DL_DIR);
  await extractRepo(REPO_ZIP_DL_DIR, REPO_ZIP_EXTRACT_DIR);
  await buildTypes(REPO_ZIP_EXTRACT_DIR);
}

main();
