const YAML = require("yaml");
const { resolve, join } = require("path");
const { parseArgs } = require("node:util");
const { Glob } = require("bun");
const { tmpdir } = require("os");

const pathPrefix = join(tmpdir(), "vu-ts-cache", "extracted", "VU-Docs-master", "types");
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
if (!typeName) {
  console.error("Error: Type name required (e.g., RawClassFile, RawEventFile)");
  process.exit(1);
}

// Infer the YAML type from the TypeScript type name
// RawClassFile -> "class", RawEventFile -> "event", etc.
const yamlType = typeName
  .replace(/^Raw/, "")
  .replace(/File$/, "")
  .toLowerCase();

console.log(`Validating ${yamlType} files using basic structure validation`);

// Basic validation - check required fields and types
function validateBasicStructure(data, expectedType) {
  const errors = [];

  // Check type field
  if (!data.type) {
    errors.push("Missing required field: type");
  } else if (data.type !== expectedType) {
    errors.push(`Type mismatch: expected "${expectedType}", got "${data.type}"`);
  }

  // Check name field (required for all types)
  if (!data.name) {
    errors.push("Missing required field: name");
  } else if (typeof data.name !== "string") {
    errors.push(`Invalid type for 'name': expected string, got ${typeof data.name}`);
  }

  // Type-specific validations
  if (expectedType === "class") {
    // Class-specific checks
    if (data.properties && typeof data.properties !== "object") {
      errors.push("Invalid type for 'properties': expected object");
    }
    if (data.methods && !Array.isArray(data.methods)) {
      errors.push("Invalid type for 'methods': expected array");
    }
    if (data.constructors && !Array.isArray(data.constructors)) {
      errors.push("Invalid type for 'constructors': expected array");
    }
  } else if (expectedType === "enum") {
    if (!data.values) {
      errors.push("Missing required field: values");
    } else if (typeof data.values !== "object" || Array.isArray(data.values)) {
      errors.push("Invalid type for 'values': expected object");
    }
  } else if (expectedType === "event") {
    if (data.params && typeof data.params !== "object") {
      errors.push("Invalid type for 'params': expected object");
    }
  } else if (expectedType === "hook") {
    if (data.params && typeof data.params !== "object") {
      errors.push("Invalid type for 'params': expected object");
    }
  } else if (expectedType === "library") {
    if (!data.methods) {
      errors.push("Missing required field: methods");
    } else if (!Array.isArray(data.methods)) {
      errors.push("Invalid type for 'methods': expected array");
    }
  }

  return errors;
}

function cleanUp(data) {
  if (data.constructors) {
    data.constructors = data.constructors.filter((c) => !!c);
  }
  return data;
}

const files = (argv.file || []).flatMap((globPath) => {
  const glob = new Glob(globPath);
  return Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
    join(pathPrefix, file)
  );
});

let validCount = 0;
let invalidCount = 0;

for (const file of files) {
  try {
    const fileContent = await Bun.file(file).text();
    const data = YAML.parse(fileContent);

    // Filter by type - only validate files matching the expected type
    const expectedType = argv.ftype || yamlType;
    if (data.type !== expectedType) {
      continue; // Skip files that don't match the expected type
    }

    const cleanedData = cleanUp(data);
    const errors = validateBasicStructure(cleanedData, expectedType);

    if (errors.length > 0) {
      invalidCount++;
      console.error(`Invalid file: ${file}`);
      errors.forEach((error) => console.error(`  - ${error}`));
    } else {
      validCount++;
    }
  } catch (error) {
    invalidCount++;
    console.error(`Error parsing file: ${file}`);
    console.error(`  ${error.message}`);
  }
}

console.log(`\nValidation complete: ${validCount} valid, ${invalidCount} invalid`);
if (invalidCount > 0) {
  process.exit(1);
}
