/**
 * Path and namespace resolution utilities
 */

import type { typeNamespace } from "../types";

/**
 * Determines the namespace context (client, server, shared, fb) from a file path
 * @param filePath - Full path to the YAML file
 * @returns The namespace context
 */
export function resolveNamespace(filePath: string): typeNamespace {
  // Handle both Windows (\) and Unix (/) path separators
  if (filePath.match(/VU-Docs-master[\\/]types[\\/]client/i)) return "client";
  if (filePath.match(/VU-Docs-master[\\/]types[\\/]server/i)) return "server";
  if (filePath.match(/VU-Docs-master[\\/]types[\\/]fb/i)) return "fb";
  return "shared";
}

/**
 * Extracts the relative path from a file path, removing the VU-Docs-master/types/ prefix
 * @param filePath - Full path to the YAML file
 * @returns Relative path from the types directory
 */
export function resolveRelPath(filePath: string): string {
  // Handle both Windows (\) and Unix (/) path separators
  return filePath.replace(/^.*[\\/]VU-Docs-master[\\/]types[\\/]/i, "");
}
