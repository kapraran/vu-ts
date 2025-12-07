import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";

// Get the project root (two levels up from src/generators)
const PROJECT_ROOT = resolve(import.meta.dir || __dirname, "../..");
const TEMPLATE_PROJECT_DIR = join(PROJECT_ROOT, "vu-ts-mod-template");
const EXT_TS_DIR = join(TEMPLATE_PROJECT_DIR, "ext-ts");

async function generateExtProject() {
  console.log("Generating vu-ts-mod-template project structure...");

  // Create directory structure
  const dirs = [
    TEMPLATE_PROJECT_DIR,
    join(TEMPLATE_PROJECT_DIR, "typings"),
    EXT_TS_DIR,
    join(EXT_TS_DIR, "client"),
    join(EXT_TS_DIR, "server"),
    join(EXT_TS_DIR, "shared"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }

  // Copy typings files
  const typingsDir = join(PROJECT_ROOT, "typings");
  const templateTypingsDir = join(TEMPLATE_PROJECT_DIR, "typings");

  const typingFiles = ["client.d.ts", "server.d.ts", "shared.d.ts"];
  for (const file of typingFiles) {
    const sourcePath = join(typingsDir, file);
    const destPath = join(templateTypingsDir, file);

    if (existsSync(sourcePath)) {
      const content = await Bun.file(sourcePath).text();
      await Bun.write(destPath, content);
      console.log(`Copied ${file} to vu-ts-mod-template/typings/`);
    } else {
      console.warn(`Warning: ${file} not found in typings directory`);
    }
  }

  // Generate tsconfig.base.json
  const baseConfig = {
    compilerOptions: {
      target: "ESNext",
      lib: ["ESNext"],
      types: ["@typescript-to-lua/language-extensions", "lua-types/5.1"],
      moduleResolution: "bundler",
      strict: true,
      skipLibCheck: true,
    },
    tstl: {
      luaTarget: "5.1",
    },
    exclude: ["node_modules"],
  };

  await Bun.write(
    join(TEMPLATE_PROJECT_DIR, "tsconfig.base.json"),
    JSON.stringify(baseConfig, null, 2) + "\n"
  );
  console.log("Generated tsconfig.base.json");

  // Generate root tsconfig.json for building all folders
  const rootConfig = {
    extends: "./tsconfig.base.json",
    compilerOptions: {
      outDir: "../ext",
      rootDir: "ext-ts",
    },
    include: ["ext-ts/client/**/*", "ext-ts/server/**/*", "ext-ts/shared/**/*"],
    exclude: ["node_modules", "typings"],
  };

  await Bun.write(
    join(TEMPLATE_PROJECT_DIR, "tsconfig.json"),
    JSON.stringify(rootConfig, null, 2) + "\n"
  );
  console.log("Generated tsconfig.json");

  // Generate folder-specific tsconfig.json files
  const folderConfigs = [
    {
      folder: "client",
      types: ["shared.d.ts", "client.d.ts"],
    },
    {
      folder: "server",
      types: ["shared.d.ts", "server.d.ts"],
    },
    {
      folder: "shared",
      types: ["shared.d.ts"],
    },
  ];

  for (const { folder, types } of folderConfigs) {
    const config = {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        outDir: `../../../ext/ext-ts/${folder}`,
        rootDir: ".",
      },
      include: ["./**/*", "./types.d.ts"],
    };

    await Bun.write(
      join(EXT_TS_DIR, folder, "tsconfig.json"),
      JSON.stringify(config, null, 2) + "\n"
    );
    console.log(`Generated ext-ts/${folder}/tsconfig.json`);

    // Generate types.d.ts with references to typings in root typings/
    const typeReferences = types
      .map((type) => `/// <reference path="../../typings/${type}" />`)
      .join("\n");

    await Bun.write(
      join(EXT_TS_DIR, folder, "types.d.ts"),
      typeReferences + "\n"
    );
    console.log(`Generated ext-ts/${folder}/types.d.ts`);

    // Create __init__.ts if it doesn't exist
    const initPath = join(EXT_TS_DIR, folder, "__init__.ts");
    if (!existsSync(initPath)) {
      await Bun.write(initPath, "");
      console.log(`Created ext-ts/${folder}/__init__.ts`);
    }
  }

  // Generate README.md
  const readme = `# Mod Template

This template provides a structure for Venice Unleashed mods with TypeScript type safety.

## Folder Structure

- **\`ext-ts/client/\`** - Client-side code (runs in the game client)
  - Has access to: \`shared.d.ts\` and \`client.d.ts\` types
- **\`ext-ts/server/\`** - Server-side code (runs on the server)
  - Has access to: \`shared.d.ts\` and \`server.d.ts\` types
- **\`ext-ts/shared/\`** - Shared code (used by both client and server)
  - Has access to: \`shared.d.ts\` types only
- **\`typings/\`** - TypeScript declaration files for Venice Unleashed API

## Type Safety

Each folder has its own \`tsconfig.json\` that restricts which type definitions are available:

- Files in \`ext-ts/client/\` cannot access server-only types
- Files in \`ext-ts/server/\` cannot access client-only types
- Files in \`ext-ts/shared/\` can only access shared types

This is enforced through the \`types.d.ts\` files in each folder, which use triple-slash directives to explicitly reference only the allowed type definitions.

## Usage

1. Place your client-side code in \`ext-ts/client/\`
2. Place your server-side code in \`ext-ts/server/\`
3. Place shared code in \`ext-ts/shared/\`
4. TypeScript will automatically enforce type restrictions based on the folder

## Building

To compile TypeScript to Lua, use:

\`\`\`bash
# Build all folders (client, server, shared)
npm run build

# Build with watch mode
npm run build:watch

# Build individual folders
npm run build:client
npm run build:server
npm run build:shared
\`\`\`

The compiled Lua files will be output to \`../ext/\` with the same folder structure (\`ext/ext-ts/client/\`, \`ext/ext-ts/server/\`, \`ext/ext-ts/shared/\`).

## Regenerating Types

To refresh the type definitions, run the generator command from the root of the vu-ts-tmp project:

\`\`\`bash
bun start generate
\`\`\`
`;

  await Bun.write(join(TEMPLATE_PROJECT_DIR, "README.md"), readme);
  console.log("Generated README.md");

  // Generate mod.json
  const modJson = {
    Name: "My first mod",
    Description: "This is my first VU mod!",
    Version: "1.0.0",
    HasVeniceEXT: true,
    Dependencies: {
      veniceext: "^1.0.0",
    },
  };

  await Bun.write(
    join(TEMPLATE_PROJECT_DIR, "mod.json"),
    JSON.stringify(modJson, null, 2) + "\n"
  );
  console.log("Generated mod.json");

  // Generate package.json
  const packageJson = {
    name: "vu-mod",
    version: "1.0.0",
    description: "Venice Unleashed mod with TypeScript type safety",
    scripts: {
      build: "tstl -p tsconfig.json",
      "build:watch": "tstl -p tsconfig.json --watch",
      "build:client": "tstl -p ext-ts/client/tsconfig.json",
      "build:server": "tstl -p ext-ts/server/tsconfig.json",
      "build:shared": "tstl -p ext-ts/shared/tsconfig.json",
    },
    dependencies: {
      "@typescript-to-lua/language-extensions": "^1.19.0",
      "lua-types": "^2.13.1",
      "typescript-to-lua": "^1.33.0",
    },
  };

  await Bun.write(
    join(TEMPLATE_PROJECT_DIR, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n"
  );
  console.log("Generated package.json");

  console.log(
    "\n✅ vu-ts-mod-template project structure generated successfully!"
  );
  console.log(`   Location: ${TEMPLATE_PROJECT_DIR}`);
}

export default generateExtProject;
