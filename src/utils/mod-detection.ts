import { existsSync } from "fs";
import { join, resolve } from "path";
import { cwd } from "process";

/**
 * Detect if we're in a mod directory by looking for ext-ts/ and typings/ directories
 * Walks up from the current directory until found or returns null
 */
export function detectModRoot(startDir?: string): string | null {
  let currentDir = startDir ? resolve(startDir) : cwd();

  // Limit search to prevent infinite loops (e.g., on filesystem root)
  const maxDepth = 20;
  let depth = 0;

  while (depth < maxDepth) {
    const extTsDir = join(currentDir, "ext-ts");
    const typingsDir = join(currentDir, "typings");

    // Check if both ext-ts and typings directories exist
    if (existsSync(extTsDir) && existsSync(typingsDir)) {
      return currentDir;
    }

    // Move up one directory
    const parentDir = resolve(currentDir, "..");

    // If we've reached the filesystem root, stop
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
    depth++;
  }

  return null;
}

/**
 * Validate that a directory is a mod root
 */
export function validateModRoot(modRoot: string): boolean {
  const extTsDir = join(modRoot, "ext-ts");
  const typingsDir = join(modRoot, "typings");

  return existsSync(extTsDir) && existsSync(typingsDir);
}

