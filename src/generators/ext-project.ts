import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { cwd } from "process";

export function checkTemplateFolderExists(
  modName?: string,
  outputDir?: string
): boolean {
  // If outputDir is specified, the template folder is outputDir/modName
  // Otherwise, create vu-ts-mod-template in project root
  const folderName = modName || "vu-ts-mod-template";
  if (outputDir) {
    const TEMPLATE_PROJECT_DIR = join(resolve(outputDir), folderName);
    return existsSync(TEMPLATE_PROJECT_DIR);
  }
  // Use cwd() to match the path resolution in buildTypes
  const TEMPLATE_PROJECT_DIR = join(cwd(), folderName);
  return existsSync(TEMPLATE_PROJECT_DIR);
}

export function getTemplateFolderPath(
  modName?: string,
  outputDir?: string
): string {
  // If outputDir is specified, the template folder is outputDir/modName
  // Otherwise, create vu-ts-mod-template in project root
  const folderName = modName || "vu-ts-mod-template";
  if (outputDir) {
    return join(resolve(outputDir), folderName);
  }
  // Use cwd() to match the path resolution in buildTypes
  return join(cwd(), folderName);
}

async function generateExtProject(
  modName?: string,
  refresh: boolean = false,
  outputDir?: string
) {
  // If outputDir is specified, the template folder is outputDir/modName
  // Otherwise, create vu-ts-mod-template in project root
  const folderName = modName || "vu-ts-mod-template";
  const TEMPLATE_PROJECT_DIR = outputDir
    ? join(resolve(outputDir), folderName)
    : join(cwd(), folderName);
  const EXT_TS_DIR = join(TEMPLATE_PROJECT_DIR, "ext-ts");

  // In refresh mode, preserve __init__.ts files
  const preservedInitFiles: Record<string, string> = {};
  if (refresh) {
    const folders = ["client", "server", "shared"];
    for (const folder of folders) {
      const initPath = join(EXT_TS_DIR, folder, "__init__.ts");
      if (existsSync(initPath)) {
        const content = await Bun.file(initPath).text();
        preservedInitFiles[folder] = content;
      }
    }
  }
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

  // Types are already generated in the project's typings folder by the type generation step
  // Just verify they exist
  const templateTypingsDir = join(TEMPLATE_PROJECT_DIR, "typings");
  const typingFiles = ["client.d.ts", "server.d.ts", "shared.d.ts"];
  let foundFiles = 0;
  for (const file of typingFiles) {
    const destPath = join(templateTypingsDir, file);
    if (existsSync(destPath)) {
      foundFiles++;
    } else {
      console.warn(`   ⚠ Warning: ${file} not found in typings directory`);
    }
  }
  if (foundFiles > 0) {
    console.log(`   ✓ TypeScript definition files ready (${foundFiles} files)`);
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
      luaPlugins: [{ name: "../../tstl-plugin.js" }],
    },
    exclude: ["node_modules"],
  };

  // Always overwrite tsconfig.base.json (even in refresh mode)
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
        baseUrl: ".",
        ...(folder !== "shared" && {
          paths: {
            "@shared/*": ["../shared/*"],
          },
        }),
      },
      include: ["./**/*", "./types.d.ts"],
    };

    // Always overwrite tsconfig.json and types.d.ts (even in refresh mode)
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

    // Create __init__.ts if it doesn't exist, or restore preserved content in refresh mode
    const initPath = join(EXT_TS_DIR, folder, "__init__.ts");
    if (refresh && preservedInitFiles[folder] !== undefined) {
      // Restore preserved content
      await Bun.write(initPath, preservedInitFiles[folder]);
    } else if (!existsSync(initPath)) {
      await Bun.write(initPath, "");
    }
  }
  const configAction = refresh ? "Refreshed" : "Generated";
  console.log(
    `   ✓ ${configAction} TypeScript configs for ${folderConfigs.length} folders`
  );

  // Generate tstl-plugin.js
  const pluginContent = `const path = require("path");
const fs = require("fs");

/**
 * TypeScriptToLua plugin that adds __shared/ prefix to all require paths
 * that resolve to files in the ext-ts/shared/ directory.
 *
 * This ensures that all imports from shared code use the __shared/ prefix
 * in the generated Lua code, even when importing from within shared itself.
 */
const plugin = {
  afterPrint(program, options, emitHost, result) {
    // Build a set of all shared modules that exist
    // We scan the ext-ts/shared directory to find all .ts files
    const sharedModules = new Set();

    // Find the shared directory from the project options
    const configDir = options.configFilePath ? path.dirname(options.configFilePath) : process.cwd();

    // The shared folder is relative to ext-ts/{client,server,shared}
    // We need to find the ext-ts base and then the shared folder
    let sharedDir;
    const possiblePaths = [
      path.resolve(configDir, 'shared'),           // From ext-ts/shared/tsconfig.json -> ext-ts/shared
      path.resolve(configDir, '..', 'shared'),      // From ext-ts/client/tsconfig.json -> ext-ts/shared
      path.resolve(configDir, '../..', 'ext-ts/shared'), // From ext-ts/shared/tsconfig.json but going up
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sharedDir = p;
        break;
      }
    }

    if (sharedDir) {
      // Recursively find all .ts files in shared directory
      const scanDir = (dir, basePath = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            scanDir(path.join(dir, entry.name), path.join(basePath, entry.name));
          } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
            // Add module path without extension and without index
            let modulePath = path.join(basePath, entry.name.slice(0, -3));
            // Convert to forward slashes
            modulePath = modulePath.replace(/\\\\/g, '/');
            // Remove /index suffix
            modulePath = modulePath.replace(/\\/index$/, '');
            sharedModules.add(modulePath);
          }
        }
      };
      scanDir(sharedDir);
    }

    // Debug: log what we found
    if (sharedModules.size > 0) {
      console.log("[TSTL Plugin] Found shared modules:", Array.from(sharedModules));
    } else {
      console.log("[TSTL Plugin] No shared modules found, searched:", possiblePaths);
    }

    // Transform require() statements in ALL output files
    for (const file of result) {
      const outputPath = file.outputPath || "";

      // Transform all require statements that reference shared modules
      const originalCode = file.code;
      file.code = file.code.replace(
        /require\\s*\\(\\s*["']([^"']+)["']\\s*\\)/g,
        (match, moduleName) => {
          // Skip if already has __shared/ prefix
          if (moduleName.startsWith("__shared/")) {
            return match;
          }

          // Skip special modules
          if (moduleName === "lualib_bundle" ||
              moduleName.startsWith("lualib_bundle") ||
              moduleName.includes("node_modules")) {
            return match;
          }

          // Check if this is a shared module
          if (sharedModules.has(moduleName)) {
            console.log("[TSTL Plugin] Transforming require:", moduleName, "-> __shared/" + moduleName);
            return "require(\\"__shared/" + moduleName + "\\")";
          }

          return match;
        }
      );

      if (file.code !== originalCode) {
        console.log("[TSTL Plugin] Modified file:", outputPath);
      }
    }
  }
};

module.exports = plugin;
`;

  // Always overwrite tstl-plugin.js (even in refresh mode)
  await Bun.write(join(TEMPLATE_PROJECT_DIR, "tstl-plugin.js"), pluginContent);
  const pluginAction = refresh ? "Refreshed" : "Generated";
  console.log(`   ✓ ${pluginAction} tstl-plugin.js`);

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

  // Always overwrite README.md (even in refresh mode)
  await Bun.write(join(TEMPLATE_PROJECT_DIR, "README.md"), readme);

  // Generate mod.json (always overwrite)
  const modDisplayName = modName || "My first mod";
  const modJson = {
    Name: modDisplayName,
    Description: `A Venice Unleashed mod built with TypeScript`,
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

  // Always overwrite watch.ts (even in refresh mode)
  await Bun.write(join(TEMPLATE_PROJECT_DIR, "watch.ts"), watchScript);

  // Generate package.json (always overwrite)
  const packageName = modName
    ? `vu-mod-${modName.toLowerCase().replace(/\s+/g, "-")}`
    : "vu-mod";
  const packageJson = {
    name: packageName,
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
  // Always overwrite .gitignore (even in refresh mode)
  await Bun.write(join(TEMPLATE_PROJECT_DIR, ".gitignore"), gitignore);

  const filesAction = refresh ? "Refreshed" : "Generated";
  console.log(
    `   ✓ ${filesAction} project files (watch.ts, README.md, mod.json, package.json, .gitignore)`
  );
  if (refresh) {
    console.log(`   ✓ Preserved __init__.ts files in client/server/shared`);
  }
  console.log(`   ✓ Template ready at: ${TEMPLATE_PROJECT_DIR}`);
}

export default generateExtProject;
