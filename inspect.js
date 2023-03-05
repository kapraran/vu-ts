const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const YAML = require("yaml");
const { glob } = require("glob");
const { JSONPath } = require("jsonpath-plus");
const { readFile } = require("fs-extra");

const argv = yargs(hideBin(process.argv))
  .usage("$0 <jsonpath>")
  .option("type")
  .array("file").argv;

const pathPrefix = ".cache/extracted/VU-Docs-master/types/";

function mergeByKey(results, { useType }) {
  return results.reduce((mergedResults, result) => {
    Object.keys(result).forEach((key) => {
      const val = useType ? typeof result[key] : result[key];
      mergedResults[key] = new Set([...(mergedResults[key] || []), val]);
    });

    return mergedResults;
  }, {});
}

async function main(globPaths, jsonPath) {
  const files = [];
  const results = [];

  for (const globPath of globPaths) {
    files.push(...(await glob(pathPrefix + globPath)));
  }

  for (const filepath of files) {
    const textContent = await readFile(filepath, "utf8");
    const parsedObject = YAML.parse(textContent);
    const result = JSONPath({ path: jsonPath, json: parsedObject });

    results.push(result);
  }

  const merged = mergeByKey(
    results.map((r) => r[0]).filter((r) => !!r),
    {
      useType: argv.type,
    }
  );

  console.log(merged);
}

const globPaths = argv.file || [
  "client/library/*.yaml",
  "server/library/*.yaml",
];
const jsonPath = argv._[0] || "$";

console.log(globPaths, jsonPath);

main(globPaths, jsonPath);
