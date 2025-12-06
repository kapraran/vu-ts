const Ajv = require("ajv");
const ajv = new Ajv();
const YAML = require("yaml");
const { resolve, join } = require("path");
const { parseArgs } = require("node:util");
const { Glob } = require("bun");
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
const { values: argv, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
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

const typeName = positionals[0];
const program = TJS.getProgramFromFiles(
  [resolve(__dirname, `./src/types/${typeName}.ts`)],
  compilerOptions
);

const schema = TJS.generateSchema(program, typeName, settings);

const files = (argv.file || []).flatMap((globPath) => {
  const glob = new Glob(globPath);
  return Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
    join(pathPrefix, file)
  );
});

for (const file of files) {
  const fileContent = await Bun.file(file).text();
  const data = YAML.parse(fileContent);

  if (argv.ftype && data.type !== argv.ftype) continue;

  const valid = ajv.validate(schema, cleanUp(data));

  if (!valid) {
    console.error(`Invalid file: ${file}`);
    console.log(ajv.errors);
    // console.log(data);
  }
}
