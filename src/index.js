const { readFile, ensureFile, readdir, writeFile } = require("fs-extra");
const { resolve } = require("path");
const yaml = require("js-yaml");
const prettier = require("prettier");
const { genClass, genEnum } = require("./generators");
const { downloadRepo, extractRepo } = require("./repo");

const url = "https://github.com/EmulatorNexus/VU-Docs/archive/master.zip";
const typingsDir = "typings";

const cacheDir = resolve(__dirname, "../.cache");
const dlZipFilepath = resolve(cacheDir, "master.zip");
const extractDir = resolve(cacheDir, "extracted");

const getRepoTypesPath = (p) => `${extractDir}/VU-Docs-master/types/${p}`;

const symbolTable = {};

function parseFileContents(yamlData) {
  const symbolTableEntry = {
    raw: yamlData,
    name: yamlData.name,
    type: yamlData.type,
    static: Object.entries(yamlData.static || {}),
    properties: Object.entries(yamlData.properties || {}),
    constructors: (yamlData.constructors || []).filter((c) => !!c),
    methods: yamlData.methods || [],
    operators: yamlData.operators || [],
    values: yamlData.values || [],
  };

  symbolTable[yamlData.name] = symbolTableEntry;
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

    let code = "";
    if (d.type === "enum") {
      code = genEnum(d);
    } else {
      code = genClass(d);
    }

    const outFile = resolve(
      __dirname,
      "..",
      `${typingsDir}/globals/${d.name}.d.ts`
    );

    await saveDeclarationFile(outFile, code);
  });
}

async function buildNamespaceTypings(ns) {
  console.log(`buildNamespaceTypings() ns=${ns}`);

  const files = await readdir(
    resolve(__dirname, "..", getRepoTypesPath(`/${ns}/type`))
  );

  const promises = [];

  for (const file of files) {
    const f = resolve(__dirname, "..", getRepoTypesPath(`/${ns}/type/${file}`));
    promises.push(parseFile(f));
  }

  await Promise.all(promises);
}

async function buildTypes() {
  console.log("buildTypes()");

  const namespaces = ["shared", "server", "client"];
  for (const ns of namespaces) {
    await buildNamespaceTypings(ns);
  }

  // const files = await readdir(
  //   resolve(__dirname, "..", getRepoTypesPath("/shared/type"))
  // );

  // const promises = [];

  // for (const file of files) {
  //   const f = resolve(
  //     __dirname,
  //     "..",
  //     getRepoTypesPath(`/shared/type/${file}`)
  //   );

  //   promises.push(parseFile(f));
  // }

  // await Promise.all(promises);

  genTypingsCode();
}

async function main() {
  await downloadRepo(url, dlZipFilepath);
  await extractRepo(dlZipFilepath, extractDir);
  await buildTypes();
}

main();
