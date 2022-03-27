const { readFile, ensureFile, readdir, writeFile } = require("fs-extra");
const { resolve } = require("path");
const yaml = require("js-yaml");
const prettier = require("prettier");
const { genClass } = require("./generators");
const { downloadRepo, extractRepo } = require("./repo");

const url = "https://github.com/EmulatorNexus/VU-Docs/archive/master.zip";
const typingsDir = "typings";

const cacheDir = resolve(__dirname, "../.cache");
const dlZipFilepath = resolve(cacheDir, "master.zip");
const extractDir = resolve(cacheDir, "extracted");

const getRepoTypesPath = (p) => `${extractDir}/VU-Docs-master/types/${p}`;

const symbolTable = {};

function parseFileContents(yamlData) {
  // const symbolTableEntry = {};

  // symbolTableEntry.raw = yamlData;

  // symbolTableEntry.name = yamlData.name;

  // symbolTableEntry.static =
  //   (yamlData.static && Object.entries(yamlData.static)) || [];

  // symbolTableEntry.constructors = (yamlData.constructors || []).filter(
  //   (c) => !!c
  // );

  symbolTable[yamlData.name] = yamlData;

  if (yamlData.properties) {
    symbolTable[yamlData.name].properties = Object.entries(yamlData.properties);
  }
}

async function parseFile(f) {
  const contents = await readFile(f, "utf8");
  const parsedYaml = yaml.load(contents);
  parseFileContents(parsedYaml);
}

async function saveDeclarationFile(filePath, code) {
  await ensureFile(filePath);
  const formattedCode = prettier.format(code, { parser: "typescript" });
  await writeFile(filePath, formattedCode, "utf8");
}

function genTypingsCode() {
  console.log("genTypingsCode()");

  Object.keys(symbolTable).map(async (key) => {
    const d = symbolTable[key];

    const code = genClass(d);

    const outFile = resolve(
      __dirname,
      "..",
      `${typingsDir}/globals/${d.name}.d.ts`
    );

    await saveDeclarationFile(outFile, code);
  });
}

async function buildTypes() {
  console.log("buildTypes()");

  const files = await readdir(
    resolve(__dirname, "..", getRepoTypesPath("/shared/type"))
  );

  const promises = [];

  for (const file of files) {
    const f = resolve(
      __dirname,
      "..",
      getRepoTypesPath(`/shared/type/${file}`)
    );

    promises.push(parseFile(f));
  }

  await Promise.all(promises);

  genTypingsCode();
}

async function main() {
  await downloadRepo(url, dlZipFilepath);
  await extractRepo(dlZipFilepath, extractDir);
  await buildTypes();
}

main();
