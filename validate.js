const Ajv = require("ajv");
const ajv = new Ajv();
const YAML = require("yaml");
const { readFileSync } = require("fs-extra");
const { globSync } = require("glob");
const { resolve } = require("path");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const TJS = require("typescript-json-schema");

const settings = {
  required: true,
};

const compilerOptions = {
  strictNullChecks: true,
};

const pathPrefix = ".cache/extracted/VU-Docs-master/types/";
const argv = yargs(hideBin(process.argv)).usage("$0 <type>").array("file").argv;

const program = TJS.getProgramFromFiles(
  [resolve(__dirname, `./src/types/${argv._[0]}.ts`)],
  compilerOptions
);

const schema = TJS.generateSchema(program, argv._[0], settings);

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
