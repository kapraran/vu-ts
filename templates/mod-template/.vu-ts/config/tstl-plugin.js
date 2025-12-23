const path = require("path");
const fs = require("fs");

/**
 * TypeScriptToLua plugin that adds __shared/ prefix to all require paths
 * that resolve to files in the shared directory.
 *
 * This ensures that all imports from shared code use the __shared/ prefix
 * in the generated Lua code, even when importing from within shared itself.
 */
const plugin = {
  beforeEmit(program, options, emitHost, result) {
    // Build maps of all shared modules with multiple path variations
    // We scan the shared directory to find all .ts files
    const sharedModules = new Map(); // Map of normalized path -> module info

    // Find the shared directory from the project options
    const configDir = options.configFilePath
      ? path.dirname(options.configFilePath)
      : process.cwd();

    console.log("[TSTL Plugin] Config dir:", configDir);

    // The shared folder is relative to ext-ts/{client,server,shared}
    // We need to find the ext-ts base and then the shared folder
    let sharedDir;
    const possiblePaths = [
      // From ext-ts/shared/tsconfig.json -> ext-ts/shared
      path.resolve(configDir, "shared"),
      // From ext-ts/client/tsconfig.json -> ext-ts/shared
      path.resolve(configDir, "..", "shared"),
      // From ext-ts/shared/tsconfig.json but going up then down
      path.resolve(configDir, "../..", "ext-ts/shared"),
      // Absolute paths from test-mod
      path.resolve(configDir, "..", "..", "ext-ts/shared"),
    ];

    console.log("[TSTL Plugin] Searching for shared directory among:");
    possiblePaths.forEach((p) => console.log("  ", p));

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sharedDir = p;
        console.log("[TSTL Plugin] Found shared directory at:", sharedDir);
        break;
      }
    }

    if (!sharedDir) {
      console.log("[TSTL Plugin] ERROR: Could not find shared directory!");
      return;
    }

    // Recursively find all .ts files in shared directory
    const scanDir = (dir, basePath = "") => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name), path.join(basePath, entry.name));
        } else if (
          entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".d.ts") &&
          entry.name !== "__init__.ts"
        ) {
          // Get module path without extension
          const modulePath = path.join(basePath, entry.name.slice(0, -3));
          const normalizedPath = modulePath.replace(/\\/g, "/");
          const moduleName = entry.name.slice(0, -3); // Just the filename without .ts
          const modulePathWithoutIndex = normalizedPath.replace(/\/index$/, "");

          // Store multiple variations for better matching
          sharedModules.set(normalizedPath, {
            path: normalizedPath,
            name: moduleName,
            fullPath: modulePathWithoutIndex,
          });
          sharedModules.set(modulePathWithoutIndex, {
            path: normalizedPath,
            name: moduleName,
            fullPath: modulePathWithoutIndex,
          });
          sharedModules.set(moduleName, {
            path: normalizedPath,
            name: moduleName,
            fullPath: modulePathWithoutIndex,
          });

          // Also store with @shared prefix for reference
          const withSharedPrefix = "@shared/" + modulePathWithoutIndex;
          sharedModules.set(withSharedPrefix, {
            path: normalizedPath,
            name: moduleName,
            fullPath: modulePathWithoutIndex,
          });

          console.log("[TSTL Plugin] Found shared module:", {
            path: normalizedPath,
            name: moduleName,
            full: modulePathWithoutIndex,
            withShared: withSharedPrefix,
          });
        }
      }
    };
    scanDir(sharedDir);

    console.log(
      "[TSTL Plugin] Total shared modules indexed:",
      sharedModules.size
    );

    // Check if we're building client or server
    const isClientBuild =
      configDir.includes("/client") || configDir.endsWith("client");
    const isServerBuild =
      configDir.includes("/server") || configDir.endsWith("server");

    // Transform require() statements in ALL output files
    // Use beforeEmit so TSTL has finished all its processing
    for (const file of result) {
      const outputPath = file.outputPath || "";
      const originalCode = file.code;

      file.code = file.code.replace(
        /require\s*\(\s*["']([^"']+)["']\s*\)/g,
        (match, moduleName) => {
          // Skip if already has __shared/ prefix
          if (moduleName.startsWith("__shared/")) {
            return match;
          }

          // Special case: Transform lualib_bundle to __shared/lualib_bundle in shared code
          // This ensures shared code loads the shared lualib_bundle
          if (moduleName === "lualib_bundle") {
            // Check if this is a shared output file (handle both / and \ path separators)
            const normalizedOutputPath = outputPath.replace(/\\/g, "/");
            const isSharedOutput = normalizedOutputPath.includes("/shared/");
            if (isSharedOutput) {
              const transformed = 'require("__shared/lualib_bundle")';
              console.log(
                "[TSTL Plugin] Transforming lualib_bundle in shared code:",
                moduleName,
                "->",
                transformed
              );
              return transformed;
            }
            // For client/server, keep lualib_bundle as is (they have their own)
            return match;
          }

          // Skip special modules (but not lualib_bundle which we handled above)
          if (
            moduleName.startsWith("lualib_bundle") ||
            moduleName.includes("node_modules")
          ) {
            return match;
          }

          // Normalize the module name for matching
          const normalizedModuleName = moduleName.replace(/\\/g, "/");

          // Check if this module is in shared
          // Try multiple matching strategies
          let matchedModule = null;

          // Strategy 1: Direct match
          if (sharedModules.has(normalizedModuleName)) {
            matchedModule = sharedModules.get(normalizedModuleName);
          }

          // Strategy 2: Check if module path ends with any shared module name
          if (!matchedModule) {
            for (const [key, moduleInfo] of sharedModules.entries()) {
              // Match if the module name ends with the shared module path
              // or if it's a base filename match
              if (
                normalizedModuleName === moduleInfo.name ||
                normalizedModuleName.endsWith("/" + moduleInfo.name) ||
                normalizedModuleName === moduleInfo.fullPath ||
                normalizedModuleName.endsWith("/" + moduleInfo.fullPath)
              ) {
                matchedModule = moduleInfo;
                break;
              }
            }
          }

          // Strategy 3: Check if it contains the shared path
          if (!matchedModule) {
            for (const [key, moduleInfo] of sharedModules.entries()) {
              if (normalizedModuleName.includes(moduleInfo.fullPath)) {
                matchedModule = moduleInfo;
                break;
              }
            }
          }

          if (matchedModule) {
            const transformed =
              'require("__shared/' + matchedModule.fullPath + '")';
            console.log(
              "[TSTL Plugin] Transforming require:",
              moduleName,
              "->",
              transformed
            );
            return transformed;
          }

          // No match found
          return match;
        }
      );

      if (file.code !== originalCode) {
        console.log("[TSTL Plugin] Modified file:", outputPath);
      }
    }

    // Remove files that shouldn't be in client/server output
    // When building client/server, remove any shared/* files that TSTL may have included
    if (isClientBuild || isServerBuild) {
      const filesToRemove = [];
      for (const file of result) {
        const outputPath = file.outputPath || "";
        const normalizedOutputPath = outputPath.replace(/\\/g, "/");

        // Check if this is a shared file in client/server output
        if (
          normalizedOutputPath.includes("/client/shared/") ||
          normalizedOutputPath.includes("/server/shared/")
        ) {
          filesToRemove.push(file);
          console.log(
            "[TSTL Plugin] Marking shared file for removal from client/server build:",
            outputPath
          );
        }
      }

      // Remove marked files from result
      for (const file of filesToRemove) {
        const index = result.indexOf(file);
        if (index > -1) {
          result.splice(index, 1);
        }
      }

      if (filesToRemove.length > 0) {
        console.log(
          `[TSTL Plugin] Removed ${filesToRemove.length} shared file(s) from ${
            isClientBuild ? "client" : "server"
          } build`
        );
      }
    }
  },

  moduleResolution(moduleName, containingFile, options, loader) {
    // Custom module resolution logic
    // This runs during TypeScript's module resolution phase

    // Find the shared directory
    const configDir = options.configFilePath
      ? path.dirname(options.configFilePath)
      : process.cwd();

    let sharedDir;
    const possiblePaths = [
      path.resolve(configDir, "shared"),
      path.resolve(configDir, "..", "shared"),
      path.resolve(configDir, "../..", "ext-ts/shared"),
      path.resolve(configDir, "..", "..", "ext-ts/shared"),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sharedDir = p;
        break;
      }
    }

    if (!sharedDir) {
      // Return default resolution
      return loader(moduleName, containingFile, options);
    }

    // Normalize module name
    const normalizedModuleName = moduleName.replace(/\\/g, "/");

    // Check if this is a shared module request
    // Look for the module in the shared directory
    const findModuleInShared = (dir, basePath = "") => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const result = findModuleInShared(
            path.join(dir, entry.name),
            path.join(basePath, entry.name)
          );
          if (result) return result;
        } else if (
          entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".d.ts")
        ) {
          const modulePath = path.join(basePath, entry.name.slice(0, -3));
          const normalizedPath = modulePath.replace(/\\/g, "/");
          const moduleName = entry.name.slice(0, -3);

          // Check various matching patterns
          if (
            normalizedModuleName === normalizedPath ||
            normalizedModuleName === moduleName ||
            normalizedModuleName === "@shared/" + normalizedPath ||
            normalizedModuleName === "@shared/" + moduleName ||
            normalizedModuleName.endsWith("/" + moduleName) ||
            normalizedModuleName.endsWith("/" + normalizedPath)
          ) {
            return path.join(dir, entry.name);
          }
        }
      }

      return null;
    };

    const resolvedFile = findModuleInShared(sharedDir);

    if (resolvedFile) {
      console.log(
        "[TSTL Plugin] Resolving shared module:",
        moduleName,
        "->",
        resolvedFile
      );

      // Check if we're building client or server (not shared)
      const isClientBuild =
        configDir.includes("/client") || configDir.endsWith("client");
      const isServerBuild =
        configDir.includes("/server") || configDir.endsWith("server");

      // When building client or server, DO NOT resolve shared modules
      // This prevents TSTL from including shared files in client/server output
      // The shared modules will be loaded at runtime via __shared/ prefix
      if (isClientBuild || isServerBuild) {
        console.log(
          "[TSTL Plugin] Skipping resolution for client/server build:",
          moduleName,
          "(will be loaded via __shared/ prefix at runtime)"
        );
        return undefined; // Return undefined to let TSTL handle it as external
      }

      return resolvedFile;
    }

    // Return default resolution for non-shared modules
    return loader(moduleName, containingFile, options);
  },
};

module.exports = plugin;
