/**
 * Metadata Management
 * Handles creation, reading, and updating of .vu-ts/metadata.json
 */

import { resolve, join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

export interface ProjectMetadata {
  version: string;
  vuDocsCommit: string;
  lastUpdate: string;
  createdAt: string;
}

/**
 * Create initial metadata file for a new project
 */
export async function createMetadataFile(
  projectPath: string,
  vuDocsCommit: string,
  vuTsVersion: string
): Promise<void> {
  const metadataDir = resolve(projectPath, ".vu-ts");
  const metadataPath = resolve(metadataDir, "metadata.json");

  // Ensure .vu-ts directory exists
  if (!existsSync(metadataDir)) {
    mkdirSync(metadataDir, { recursive: true });
  }

  const now = new Date().toISOString();
  const metadata: ProjectMetadata = {
    version: vuTsVersion,
    vuDocsCommit,
    lastUpdate: now,
    createdAt: now,
  };

  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + "\n", "utf-8");
}

/**
 * Read metadata file from project
 */
export function readMetadata(projectPath: string): ProjectMetadata {
  const metadataPath = resolve(projectPath, ".vu-ts", "metadata.json");

  if (!existsSync(metadataPath)) {
    throw new Error(
      `Metadata file not found: ${metadataPath}\n` +
        `This is not a vu-ts project. Run 'vu-ts init <name>' first.`
    );
  }

  try {
    const content = readFileSync(metadataPath, "utf-8");
    return JSON.parse(content) as ProjectMetadata;
  } catch (error) {
    throw new Error(
      `Failed to read metadata file: ${error}\n` +
        `Try running 'vu-ts init --force' to regenerate.`
    );
  }
}

/**
 * Update metadata file with new values
 */
export function updateMetadata(
  projectPath: string,
  updates: Partial<Pick<ProjectMetadata, "vuDocsCommit" | "lastUpdate" | "version">>
): ProjectMetadata {
  const metadataPath = resolve(projectPath, ".vu-ts", "metadata.json");

  if (!existsSync(metadataPath)) {
    throw new Error(
      `Metadata file not found: ${metadataPath}\n` +
        `This is not a vu-ts project.`
    );
  }

  const currentMetadata = readMetadata(projectPath);
  const updatedMetadata: ProjectMetadata = {
    ...currentMetadata,
    ...updates,
  };

  writeFileSync(
    metadataPath,
    JSON.stringify(updatedMetadata, null, 2) + "\n",
    "utf-8"
  );

  return updatedMetadata;
}

/**
 * Get metadata file path
 */
export function getMetadataPath(projectPath: string): string {
  return resolve(projectPath, ".vu-ts", "metadata.json");
}
