const { readFile, ensureFile, readdir, writeFile } = require("fs-extra");
const { resolve } = require("path");
const yaml = require("js-yaml");
const prettier = require("prettier");
const {
  genClassMethod,
  genClassProp,
  genClassOperator,
  genStaticProperties,
  genClassConstructor,
} = require("./generators");
const { downloadRepo, extractRepo } = require("./repo");

const url = "https://github.com/EmulatorNexus/VU-Docs/archive/master.zip";
const typingsDir = "typings";

const cacheDir = resolve(__dirname, "../.cache");
const dlZipFilepath = resolve(cacheDir, "master.zip");
const extractDir = resolve(cacheDir, "extracted");

const getTypePath = (p) => `${extractDir}/VU-Docs-master/types/${p}`;

const typings = {};

function parseFileContents(yamlData) {
  typings[yamlData.name] = yamlData;

  if (yamlData.properties) {
    typings[yamlData.name].properties = Object.entries(yamlData.properties);
  }
}

async function parseFile(f) {
  const contents = await readFile(f, "utf8");
  const parsedYaml = yaml.load(contents);
  parseFileContents(parsedYaml);
}

function genTypingsCode() {
  console.log("gentypings");
  Object.keys(typings).map(async (key) => {
    const d = typings[key];

    const code = `class ${d.name} {
      ${((d.static && Object.entries(d.static)) || [])
        .map(genStaticProperties)
        .join("\n")}

      ${(d.properties || []).map(genClassProp).join("\n")}

      ${(d.constructors || [])
        .filter((c) => !!c)
        .map(genClassConstructor)
        .join("\n")}

      ${(d.methods || []).map(genClassMethod).join("\n")}

      ${(d.operators || []).map(genClassOperator).join("\n")}
    }`;

    const outFile = resolve(
      __dirname,
      "..",
      `${typingsDir}/types/${d.name}.d.ts`
    );
    await ensureFile(outFile);

    const formatCode = prettier.format(code, { parser: "typescript" });
    await writeFile(outFile, formatCode, "utf8");
  });
}

async function buildTypes() {
  console.log("buildTypes()");

  const files = await readdir(
    // resolve(__dirname, "..", getTypePath("/client/library"))
    resolve(__dirname, "..", getTypePath("/shared/type"))
  );

  for (const file of files) {
    const f = resolve(__dirname, "..", getTypePath(`/shared/type/${file}`));
    // console.log(f);
    await parseFile(f);
  }

  genTypingsCode();
}

async function main() {
  await downloadRepo(url, dlZipFilepath);
  await extractRepo(dlZipFilepath, extractDir);
  await buildTypes();
}

main();
