const Ajv = require("ajv");
const ajv = new Ajv();
const YAML = require("yaml");
const { readFileSync } = require("fs-extra");
const { globSync } = require("glob");
const { resolve } = require("path");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const pathPrefix = ".cache/extracted/VU-Docs-master/types/";
const argv = yargs(hideBin(process.argv)).usage("$0 <type>").array("file").argv;
const schema = JSON.parse(
  readFileSync(resolve(__dirname, `./src/types/${argv._[0]}.schema.json`))
);

const files = (argv.file || []).flatMap((globPath) =>
  globSync(pathPrefix + globPath)
);

files.forEach((file) => {
  const data = YAML.parse(readFileSync(file, "utf8"));
  const valid = ajv.validate(schema, data);

  if (!valid) {
    console.error(`Invalid file: ${file}`);
    console.log(ajv.errors);
  }
});

// for (const globPath of argv.file || []) {
//   files.push(...(await glob(pathPrefix + globPath)));
// }

// const schema = {
//   type: "object",
//   properties: {
//     foo: { type: "integer" },
//     bar: { type: "string" },
//   },
//   required: ["foo"],
//   additionalProperties: false,
// };

// const data = { foo: 1, bar: "abc" };
// const valid = ajv.validate(schema, data);
// if (!valid) console.log(ajv.errors);
