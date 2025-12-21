const { parseArgs } = require("node:util");
const { join } = require("path");
const { tmpdir } = require("os");
const YAML = require("yaml");
const { Glob } = require("bun");
const { JSONPath } = require("jsonpath-plus");

const { values: argv, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    type: {
      type: "string",
    },
    ftype: {
      type: "string",
    },
    file: {
      type: "string",
      multiple: true,
    },
  },
  allowPositionals: true,
});

const pathPrefix = join(tmpdir(), "vu-ts-cache", "extracted", "VU-Docs-master", "types");

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
    const glob = new Glob(globPath);
    const matches = Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
      join(pathPrefix, file)
    );
    files.push(...matches);
  }

  // console.log(files);

  for (const filepath of files) {
    const textContent = await Bun.file(filepath).text();
    const parsedObject = YAML.parse(textContent);

    if (argv.ftype && parsedObject.type !== argv.ftype) continue;

    const result = JSONPath({ path: jsonPath, json: parsedObject });

    results.push(result);
  }

  const merged = mergeByKey(
    results.flat().filter((r) => !!r),
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
const jsonPath = positionals[0] || "$";

console.log(globPaths, jsonPath);

main(globPaths, jsonPath);
