/**
 * Update Manager
 * Handles checking for and applying updates to vu-ts projects
 */

import { resolve, join } from "path";
import { existsSync, rmSync, mkdirSync, readFileSync } from "fs";
import { cwd } from "process";
import { getLatestCommitHash, downloadRepo, extractRepo } from "./repo";
import {
  REPO_ZIP_DL_DIR,
  REPO_ZIP_EXTRACT_DIR,
} from "./config";
import {
  readMetadata,
  updateMetadata,
  type ProjectMetadata,
} from "./generators/metadata";
import generateExtProject from "./generators/ext-project";

export interface UpdateOptions {
  force?: boolean;
  modRoot?: string;
}

export interface UpdateStatus {
  hasUpdate: boolean;
  currentCommit?: string;
  latestCommit?: string;
  commitsAhead?: number;
  metadata?: ProjectMetadata;
}

/**
 * Check if updates are available for a project
 */
export async function checkForUpdates(
  projectPath: string
): Promise<UpdateStatus> {
  const metadata = readMetadata(projectPath);
  const latestCommit = await getLatestCommitHash();

  if (!latestCommit) {
    return {
      hasUpdate: false,
      currentCommit: metadata.vuDocsCommit,
      latestCommit: undefined,
      metadata,
    };
  }

  const hasUpdate = latestCommit !== metadata.vuDocsCommit;

  return {
    hasUpdate,
    currentCommit: metadata.vuDocsCommit,
    latestCommit,
    metadata,
  };
}

/**
 * Perform update on a project
 */
export async function performUpdate(
  projectPath: string,
  options: UpdateOptions = {}
): Promise<void> {
  const { force = false } = options;

  // Validate project
  const metadataPath = resolve(projectPath, ".vu-ts", "metadata.json");
  if (!existsSync(metadataPath)) {
    throw new Error(
      `Not a vu-ts project: ${projectPath}\n` +
        `Run 'vu-ts init <name>' first to create a project.`
    );
  }

  // Read current metadata
  const currentMetadata = readMetadata(projectPath);

  // Get latest commit
  const latestCommit = await getLatestCommitHash();

  if (!latestCommit) {
    console.warn(
      "⚠ Warning: Could not fetch latest commit. Using cached data."
    );
  }

  // Check if update is needed
  const hasUpdate =
    force || !latestCommit || latestCommit !== currentMetadata.vuDocsCommit;

  if (!hasUpdate && !force) {
    console.log("✓ Already up to date");
    console.log(
      `   Commit: ${currentMetadata.vuDocsCommit.substring(0, 7)}`
    );
    return;
  }

  // Show update info
  if (latestCommit && latestCommit !== currentMetadata.vuDocsCommit) {
    console.log(
      `🔄 Updating types (${currentMetadata.vuDocsCommit.substring(
        0,
        7
      )} → ${latestCommit.substring(0, 7)})...`
    );
  } else {
    console.log("🔄 Updating project files...");
  }

  // Download and extract VU-Docs if commit changed
  if (latestCommit && latestCommit !== currentMetadata.vuDocsCommit) {
    console.log("📦 Syncing repository...");
    await downloadRepo(
      "https://github.com/EmulatorNexus/VU-Docs/archive/master.zip",
      REPO_ZIP_DL_DIR,
      latestCommit
    );
    await extractRepo(REPO_ZIP_DL_DIR, REPO_ZIP_EXTRACT_DIR, latestCommit);
  }

  // Regenerate types
  console.log("🔨 Regenerating type definitions...");
  await regenerateTypes(projectPath);

  // Update helper files
  console.log("🔧 Updating helper scripts...");
  await updateHelperFiles(projectPath);

  // Update metadata
  const newCommit = latestCommit || currentMetadata.vuDocsCommit;
  updateMetadata(projectPath, {
    vuDocsCommit: newCommit,
    lastUpdate: new Date().toISOString(),
  });

  console.log("✅ Update complete!");
}

/**
 * Regenerate type definitions for a project
 */
async function regenerateTypes(projectPath: string): Promise<void> {
  // Import buildTypes from index
  const { buildTypes } = await import("./index");

  const outputDir = resolve(projectPath, ".vu-ts", "typings");

  await buildTypes(
    REPO_ZIP_EXTRACT_DIR,
    outputDir,
    false, // generateTemplate
    undefined,
    undefined
  );

  console.log("   ✓ Type definitions updated");
}

/**
 * Update helper files from template
 */
async function updateHelperFiles(
  projectPath: string
): Promise<void> {
  // Call generateExtProject with refresh mode
  // This will regenerate all helper files while preserving __init__.ts files
  await generateExtProject(
    undefined, // modName (not needed for update)
    true, // refresh = true to preserve __init__.ts files
    projectPath, // outputDir = project path
    undefined, // vuDocsCommit (not needed for update)
    undefined // vuTsVersion (not needed for update)
  );

  console.log("   ✓ Helper scripts updated");
}

/**
 * Get project path from modRoot option or cwd
 */
export function getProjectPath(modRoot?: string): string {
  if (modRoot) {
    return resolve(modRoot);
  }
  return cwd();
}
