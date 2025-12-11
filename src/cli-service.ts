/**
 * CLI Service - Handles the execution of CLI commands
 * This module separates CLI logic from the core type generation pipeline
 */

import { main } from "./index";
import { readFileSync } from "fs";
import { resolve } from "path";
import { FeatureFlags } from "./pipeline/config/feature-flags";

export interface InitCommandOptions {
  name?: string;
  output?: string;
  force?: boolean;
  refresh?: boolean;
}

export interface TypesCommandOptions {
  output?: string;
  refresh?: boolean;
}

/**
 * Execute the 'init' command - creates a new mod project with TypeScript types
 */
export async function executeInitCommand(
  options: InitCommandOptions
): Promise<void> {
  const { name, output, force, refresh } = options;

  if (!name) {
    throw new Error(
      "Project name is required. Usage: vu-ts init <name> [options]"
    );
  }

  // Pre-flight checks - validate folder existence BEFORE doing any work

  if (refresh && force) {
    throw new Error("--force and --refresh cannot be used together");
  }

  console.log(`🚀 Creating new mod project "${name}"...`);

  // Now proceed with the actual work
  // Pass the correct options to main which will handle both type generation and project creation
  await main({
    generateTemplate: true,
    modName: name,
    outputDir: output,
    rm: force || false,
    refresh: refresh || false,
  });

  console.log(`\n✅ Project "${name}" created successfully!`);
  console.log(`   Next steps:`);
  console.log(`   • cd ${name}`);
  console.log(`   • bun install  # Install dependencies`);
  console.log(`   • Start developing your mod with full TypeScript support!`);
}

/**
 * Execute the 'types' command - generates TypeScript declaration files only
 */
export async function executeTypesCommand(
  options: TypesCommandOptions
): Promise<void> {
  const featureFlags = FeatureFlags.getInstance();
  const flagValue = featureFlags.getFlag("useLegacyPipeline");
  const useLegacyPipeline = flagValue === true; // For CLI logging only, undefined means new pipeline

  if (useLegacyPipeline) {
    console.log("🔄 Using legacy pipeline for types generation");
  } else {
    console.log("🚀 Using new pipeline for types generation");
  }

  console.log(`🔨 Generating TypeScript declaration files...`);

  await main({
    generateTemplate: false,
    outputDir: options.output,
    refresh: options.refresh || false,
  });

  const outputLocation = options.output || "./typings";
  console.log(
    `\n✅ TypeScript types generated successfully in "${outputLocation}"!`
  );
  console.log(`   Generated files:`);
  console.log(`   • client.d.ts - Client-side API types`);
  console.log(`   • server.d.ts - Server-side API types`);
  console.log(`   • shared.d.ts - Shared types and utilities`);
}

/**
 * Show version information
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
