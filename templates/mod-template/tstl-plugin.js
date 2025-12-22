const path = require("path");
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
    const configDir = options.configFilePath
      ? path.dirname(options.configFilePath)
      : process.cwd();

    // The shared folder is relative to ext-ts/{client,server,shared}
    // We need to find the ext-ts base and then the shared folder
    let sharedDir;
    const possiblePaths = [
      path.resolve(configDir, "shared"), // From ext-ts/shared/tsconfig.json -> ext-ts/shared
      path.resolve(configDir, "..", "shared"), // From ext-ts/client/tsconfig.json -> ext-ts/shared
      path.resolve(configDir, "../..", "ext-ts/shared"), // From ext-ts/shared/tsconfig.json but going up
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sharedDir = p;
        break;
      }
    }

    if (sharedDir) {
      // Recursively find all .ts files in shared directory
      const scanDir = (dir, basePath = "") => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            scanDir(
              path.join(dir, entry.name),
              path.join(basePath, entry.name)
            );
          } else if (
            entry.name.endsWith(".ts") &&
            !entry.name.endsWith(".d.ts")
          ) {
            // Add module path without extension and without index
            let modulePath = path.join(basePath, entry.name.slice(0, -3));
            // Convert to forward slashes
            modulePath = modulePath.replace(/\\/g, "/");
            // Remove /index suffix
            modulePath = modulePath.replace(/\/index$/, "");
            sharedModules.add(modulePath);
          }
        }
      };
      scanDir(sharedDir);
    }

    // Debug: log what we found
    if (sharedModules.size > 0) {
      console.log(
        "[TSTL Plugin] Found shared modules:",
        Array.from(sharedModules)
      );
    } else {
      console.log(
        "[TSTL Plugin] No shared modules found, searched:",
        possiblePaths
      );
    }

    // Transform require() statements in ALL output files
    for (const file of result) {
      const outputPath = file.outputPath || "";

      // Transform all require statements that reference shared modules
      const originalCode = file.code;
      file.code = file.code.replace(
        /require\s*\(\s*["']([^"']+)["']\s*\)/g,
        (match, moduleName) => {
          // Skip if already has __shared/ prefix
          if (moduleName.startsWith("__shared/")) {
            return match;
          }

          // Skip special modules
          if (
            moduleName === "lualib_bundle" ||
            moduleName.startsWith("lualib_bundle") ||
            moduleName.includes("node_modules")
          ) {
            return match;
          }

          // Check if this is a shared module
          if (sharedModules.has(moduleName)) {
            console.log(
              "[TSTL Plugin] Transforming require:",
              moduleName,
              "-> __shared/" + moduleName
            );
            return 'require("__shared/' + moduleName + '")';
          }

          return match;
        }
      );

      if (file.code !== originalCode) {
        console.log("[TSTL Plugin] Modified file:", outputPath);
      }
    }
  },
};

module.exports = plugin;
