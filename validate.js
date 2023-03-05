const Ajv = require("ajv");
const ajv = new Ajv();
const YAML = require("yaml");
const { readFileSync } = require("fs-extra");
const { globSync } = require("glob");
const { resolve } = require("path");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const TJS = require("typescript-json-schema");

function cleanUp(data) {
  if (data.constructors) {
    data.constructors = data.constructors.filter((c) => !!c);
  }

  return data;
}

const settings = {
  required: true,
};

const compilerOptions = {
  strictNullChecks: true,
};

const pathPrefix = ".cache/extracted/VU-Docs-master/types/";
const argv = yargs(hideBin(process.argv))
  .usage("$0 <type>")
  .option("ftype")
  .array("file").argv;

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

  if (argv.ftype && data.type !== argv.ftype) return;

  const valid = ajv.validate(schema, cleanUp(data));

  if (!valid) {
    console.error(`Invalid file: ${file}`);
    console.log(ajv.errors);
    // console.log(data);
  }
});
