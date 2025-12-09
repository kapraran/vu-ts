#!/usr/bin/env bun

import { main } from "./index";
import { readFileSync } from "fs";
import { resolve } from "path";

interface CliOptions {
  help?: boolean;
  version?: boolean;
  output?: string;
  generate?: boolean;
  modName?: string;
  rm?: boolean;
  refresh?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (arg === "--output" || arg === "-o") {
      if (i + 1 < args.length) {
        options.output = args[++i];
      } else {
        console.error("Error: --output requires a directory path");
        process.exit(1);
      }
    } else if (arg === "generate") {
      options.generate = true;
      // Check if next argument is a mod name (not a flag)
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options.modName = args[++i];
      }
    } else if (arg === "--rm") {
      options.rm = true;
    } else if (arg === "--refresh") {
      options.refresh = true;
    } else {
      console.error(`Error: Unknown argument: ${arg}`);
      console.error("Run with --help for usage information");
      process.exit(1);
    }
  }

  return options;
}

function showHelp() {
  const helpText = `
VU TypeScript Generator

A TypeScript declaration file generator for VU-Docs. This tool downloads the VU-Docs 
repository, parses YAML documentation files, and generates TypeScript declaration files 
(.d.ts) organized by namespace.

USAGE:
    bunx vu-ts [OPTIONS] [COMMAND]

COMMANDS:
    generate [name]       Generate both type definitions and mod template project
                          If [name] is provided, creates a folder with that name
                          (default: generates only type definitions)

OPTIONS:
    --output, -o <dir>    Specify output directory for generated type definitions
                          (default: ./typings)
    --rm                  When used with 'generate', delete existing folder if it exists
    --refresh             Refresh existing output: overwrite all generated files
                          (preserves __init__.ts files in client/server/shared)
                          Requires output directory to exist
    --help, -h            Show this help message
    --version, -v         Show version number

EXAMPLES:
    bunx vu-ts                           Generate types to ./typings
    bunx vu-ts --output ./types          Generate types to ./types
    bunx vu-ts generate                  Generate types and mod template
    bunx vu-ts generate my-mod           Generate types and mod template in ./my-mod folder
    bunx vu-ts generate --rm              Generate types and mod template, remove existing folder
    bunx vu-ts --refresh                 Refresh types in ./typings (overwrites existing)
    bunx vu-ts generate --refresh         Refresh types and template (preserves __init__.ts files)
    bunx vu-ts --output ./custom generate Generate types to ./custom and template

OUTPUT:
    By default, generates the following files:
    - typings/client.d.ts    (client-side types)
    - typings/server.d.ts    (server-side types)
    - typings/shared.d.ts    (shared types)

    When using 'generate' command, also creates:
    - [mod-name]/   (mod template project structure)
      If mod name is provided, uses that name. Otherwise uses default name.
`;
  console.log(helpText.trim());
}

function showVersion() {
  try {
    const packagePath = resolve(import.meta.dir || __dirname, "../package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    console.log(packageJson.version || "unknown");
  } catch (error) {
    console.error("Error reading version");
    process.exit(1);
  }
}

async function run() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    showVersion();
    return;
  }

  // Call main with options
  await main({
    outputDir: options.output,
    generateTemplate: options.generate || false,
    modName: options.modName,
    rm: options.rm,
    refresh: options.refresh,
  });
}

run().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

