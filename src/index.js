const { readFile, ensureFile, readdir, writeFile } = require("fs-extra");
const { resolve } = require("path");
const yaml = require("js-yaml");
const prettier = require("prettier");
const { genClass, genEnum } = require("./generators");
const { downloadRepo, extractRepo } = require("./repo");
const {
  parseTypesFile,
  parseLibraryFile,
  parseEventsFile,
  parseHooksFile,
} = require("./parsers");

const url = "https://github.com/EmulatorNexus/VU-Docs/archive/master.zip";
const typingsDir = "typings";

const cacheDir = resolve(__dirname, "../.cache");
const dlZipFilepath = resolve(cacheDir, "master.zip");
const extractDir = resolve(cacheDir, "extracted");

const getRepoTypesPath = (p) => `${extractDir}/VU-Docs-master/types/${p}`;

const symbolTable = {};

async function readYamlData(filePath) {
  const contents = await readFile(filePath, "utf8");
  return yaml.load(contents);
}

async function parseFile(symbolTable, f, parserFunc, ns, allsymbolTable) {
  const parsedYaml = await readYamlData(f);
  parserFunc(symbolTable, parsedYaml, allsymbolTable, ns);
}

async function saveDeclarationFile(filePath, code) {
  await ensureFile(filePath);
  const formattedCode = prettier.format(code, { parser: "typescript" });
  await writeFile(filePath, formattedCode, "utf8");
}

function genTypingsCode(symbolTable, ns) {
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
      `${typingsDir}/${ns}/${d.name}.d.ts`
    );

    await saveDeclarationFile(outFile, code);
  });
}

async function buildNamespaceTypings(ns) {
  console.log(`buildNamespaceTypings() ns=${ns}`);

  const root = ns === "fb" ? "/fb" : `/${ns}/type`;

  const nsSymbolTable = {};
  symbolTable[ns] = nsSymbolTable;

  const promises = [];

  const subRoots =
    ns === "fb"
      ? [["", parseTypesFile]]
      : [
          ["type", parseTypesFile],
          ["library", parseLibraryFile],
          ["event", parseEventsFile],
          ["hook", parseHooksFile],
        ];

  for (const subRoot of subRoots) {
    const s = `/${ns}/${subRoot[0]}`;
    const subDir = resolve(__dirname, "..", getRepoTypesPath(s));

    const files = await readdir(subDir);

    for (const fname of files) {
      const f = resolve(subDir, fname);
      promises.push(parseFile(nsSymbolTable, f, subRoot[1], ns, symbolTable));
    }
  }

  await Promise.all(promises);
}

async function buildTypes() {
  console.log("buildTypes()");

  const namespaces = ["fb", "shared", "server", "client"];
  // const namespaces = ["shared"];
  for (const ns of namespaces) {
    await buildNamespaceTypings(ns);
    await genTypingsCode(symbolTable[ns], ns);
  }

  // put all together
  const colls = [
    ["shared", ["fb", "shared"]],
    ["client", ["fb", "shared", "client"]],
    ["server", ["fb", "shared", "server"]],
  ];

  for (const [name, deps] of colls) {
    const filePath = resolve(typingsDir, `${name}.d.ts`);
    const codeParts = {};

    for (const dep of deps) {
      const dirPath = resolve(typingsDir, dep);
      const files = await readdir(dirPath);

      for (const f of files) {
        const ff = resolve(dirPath, f);
        const contents = await readFile(ff, "utf8");
        codeParts[f] = contents;
      }
    }

    await writeFile(filePath, Object.values(codeParts).join("\n"), "utf8");
  }
}

async function main() {
  await downloadRepo(url, dlZipFilepath);
  await extractRepo(dlZipFilepath, extractDir);
  await buildTypes();
}

main();
