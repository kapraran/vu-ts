import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";

// Get the project root (two levels up from src/generators)
const PROJECT_ROOT = resolve(import.meta.dir || __dirname, "../..");
const TEMPLATE_PROJECT_DIR = join(PROJECT_ROOT, "vu-ts-mod-template");
const EXT_TS_DIR = join(TEMPLATE_PROJECT_DIR, "ext-ts");

async function generateExtProject() {
  // Create directory structure
  const dirs = [
    TEMPLATE_PROJECT_DIR,
    join(TEMPLATE_PROJECT_DIR, "typings"),
    EXT_TS_DIR,
    join(EXT_TS_DIR, "client"),
    join(EXT_TS_DIR, "server"),
    join(EXT_TS_DIR, "shared"),
  ];

  let createdDirs = 0;
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      createdDirs++;
    }
  }
  if (createdDirs > 0) {
    console.log(`   ✓ Created ${createdDirs} directories`);
  }

  // Copy typings files
  const typingsDir = join(PROJECT_ROOT, "typings");
  const templateTypingsDir = join(TEMPLATE_PROJECT_DIR, "typings");

  const typingFiles = ["client.d.ts", "server.d.ts", "shared.d.ts"];
  let copiedFiles = 0;
  for (const file of typingFiles) {
    const sourcePath = join(typingsDir, file);
    const destPath = join(templateTypingsDir, file);

    if (existsSync(sourcePath)) {
      const content = await Bun.file(sourcePath).text();
      await Bun.write(destPath, content);
      copiedFiles++;
    } else {
      console.warn(`   ⚠ Warning: ${file} not found in typings directory`);
    }
  }
  if (copiedFiles > 0) {
    console.log(`   ✓ Copied ${copiedFiles} typing files`);
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

  // No root tsconfig.json for building - each folder builds separately
  // This ensures each folder gets its own lualib_bundle.lua

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
        outDir: `../../ext/${folder}`,
        rootDir: ".",
      },
      include: ["./**/*", "./types.d.ts"],
    };

    await Bun.write(
      join(EXT_TS_DIR, folder, "tsconfig.json"),
      JSON.stringify(config, null, 2) + "\n"
    );

    // Generate types.d.ts with references to typings in root typings/
    const typeReferences = types
      .map((type) => `/// <reference path="../../typings/${type}" />`)
      .join("\n");

    await Bun.write(
      join(EXT_TS_DIR, folder, "types.d.ts"),
      typeReferences + "\n"
    );

    // Create __init__.ts if it doesn't exist
    const initPath = join(EXT_TS_DIR, folder, "__init__.ts");
    if (!existsSync(initPath)) {
      await Bun.write(initPath, "");
    }
  }
  console.log(`   ✓ Generated TypeScript configs for ${folderConfigs.length} folders`);

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
bun run build

# Watch mode - rebuilds all folders on file changes
bun run watch

# Build individual folders
bun run build:client
bun run build:server
bun run build:shared

# Watch individual folders
bun run watch:client
bun run watch:server
bun run watch:shared
\`\`\`

The compiled Lua files will be output to \`../ext/\` with the same folder structure (\`ext/client/\`, \`ext/server/\`, \`ext/shared/\`). Each folder gets its own \`lualib_bundle.lua\` so they are self-contained.

## Regenerating Types

To refresh the type definitions, run the generator command:

\`\`\`bash
bunx vu-ts generate
\`\`\`
`;

  await Bun.write(join(TEMPLATE_PROJECT_DIR, "README.md"), readme);

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

  // Generate watch.ts script
  const watchScript = `#!/usr/bin/env bun

// Watch script that runs all three TypeScriptToLua watch processes in parallel
const processes = [
  Bun.spawn(["tstl", "-p", "ext-ts/client/tsconfig.json", "--watch"], {
    stdout: "inherit",
    stderr: "inherit",
  }),
  Bun.spawn(["tstl", "-p", "ext-ts/server/tsconfig.json", "--watch"], {
    stdout: "inherit",
    stderr: "inherit",
  }),
  Bun.spawn(["tstl", "-p", "ext-ts/shared/tsconfig.json", "--watch"], {
    stdout: "inherit",
    stderr: "inherit",
  }),
];

console.log("👀 Watching client, server, and shared folders...");
console.log("Press Ctrl+C to stop\\n");

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\\n🛑 Stopping watch processes...");
  for (const proc of processes) {
    proc.kill();
  }
  await Promise.all(processes.map((p) => p.exited));
  process.exit(0);
});

// Wait for all processes (they run indefinitely in watch mode)
await Promise.all(processes.map((p) => p.exited));
`;

  await Bun.write(join(TEMPLATE_PROJECT_DIR, "watch.ts"), watchScript);

  // Generate package.json
  const packageJson = {
    name: "vu-mod",
    version: "1.0.0",
    description: "Venice Unleashed mod with TypeScript type safety",
    scripts: {
      build:
        "tstl -p ext-ts/client/tsconfig.json && tstl -p ext-ts/server/tsconfig.json && tstl -p ext-ts/shared/tsconfig.json",
      "build:client": "tstl -p ext-ts/client/tsconfig.json",
      "build:server": "tstl -p ext-ts/server/tsconfig.json",
      "build:shared": "tstl -p ext-ts/shared/tsconfig.json",
      watch: "bun watch.ts",
      "watch:client": "tstl -p ext-ts/client/tsconfig.json --watch",
      "watch:server": "tstl -p ext-ts/server/tsconfig.json --watch",
      "watch:shared": "tstl -p ext-ts/shared/tsconfig.json --watch",
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

  // Generate .gitignore
  const gitignore = `node_modules/
ext/
`;
  await Bun.write(join(TEMPLATE_PROJECT_DIR, ".gitignore"), gitignore);
  
  console.log(`   ✓ Generated project files (watch.ts, README.md, mod.json, package.json, .gitignore)`);
  console.log(`   ✓ Template ready at: ${TEMPLATE_PROJECT_DIR}`);
}

export default generateExtProject;
