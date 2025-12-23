/**
 * CLI Service - Update Commands
 * Handles the execution of update and status commands
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { performUpdate, checkForUpdates, getProjectPath } from "./update-manager";
import { readMetadata } from "./generators/metadata";

export interface UpdateCommandOptions {
  force?: boolean;
  modRoot?: string;
}

export interface StatusCommandOptions {
  modRoot?: string;
}

/**
 * Execute the 'update' command - updates types and helper files
 */
export async function executeUpdateCommand(
  options: UpdateCommandOptions
): Promise<void> {
  const { force = false, modRoot } = options;

  const projectPath = getProjectPath(modRoot);

  try {
    await performUpdate(projectPath, { force });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Update failed: ${error}`);
  }
}

/**
 * Execute the 'status' command - shows update status and version info
 */
export async function executeStatusCommand(
  options: StatusCommandOptions
): Promise<void> {
  const { modRoot } = options;
  const projectPath = getProjectPath(modRoot);

  try {
    // Read metadata
    const metadata = readMetadata(projectPath);

    console.log("📊 Project Status\n");
    console.log(`Project: ${modRoot ? projectPath : "current directory"}`);
    console.log(`vu-ts version: ${metadata.version}`);
    console.log(
      `VU-Docs commit: ${metadata.vuDocsCommit.substring(0, 7)}`
    );
    console.log(`Last update: ${formatDate(metadata.lastUpdate)}`);

    // Check for updates
    const status = await checkForUpdates(projectPath);

    if (status.hasUpdate && status.latestCommit) {
      console.log(
        `\n📦 Update available: ${status.currentCommit!.substring(
          0,
          7
        )} → ${status.latestCommit.substring(0, 7)}`
      );
      console.log(`Run 'vu-ts update' to update.`);
    } else {
      console.log(`\n✓ Up to date`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Status check failed: ${error}`);
  }
}

/**
 * Format ISO date to human-readable string
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return "just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch {
    return isoString;
  }
}

/**
 * Show version information (for consistency with other commands)
 */
export function showVersion(): void {
  try {
    const packagePath = resolve(
      import.meta.dir || __dirname,
      "../package.json"
    );
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    console.log(packageJson.version || "unknown");
  } catch (error) {
    console.error("Error reading version");
    process.exit(1);
  }
}
