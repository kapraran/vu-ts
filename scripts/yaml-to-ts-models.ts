import { Glob } from "bun";
import { join } from "path";
import { tmpdir } from "os";
import YAML from "yaml";
import { spawn } from "bun";

const pathPrefix = join(tmpdir(), "vu-ts-cache", "extracted", "VU-Docs-master", "types");
const jsonDir = join(tmpdir(), "vu-ts-cache", "json-by-type");
const generatedDir = "src/types/generated";

async function main() {
  console.log("Starting YAML → JSON → TypeScript model generation...");

  // Step 1: Convert YAML to JSON, grouped by type
  console.log("\nStep 1: Converting YAML files to JSON...");
  const glob = new Glob("**/*.yaml");
  const filePaths = Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
    join(pathPrefix, file)
  );

  console.log(`Found ${filePaths.length} YAML files`);

  // Group by type and convert to JSON
  const filesByType: Record<string, string[]> = {};

  for (const filePath of filePaths) {
    try {
      const content = await Bun.file(filePath).text();
      const data = YAML.parse(content);

      if (!data.type) {
        console.warn(`File ${filePath} has no type field, skipping`);
        continue;
      }

      const type = data.type;
      if (!filesByType[type]) {
        filesByType[type] = [];
      }

      // Convert to JSON and save
      const jsonPath = filePath
        .replace(pathPrefix, "")
        .replace(/\.yaml$/, ".json")
        .replace(/\\/g, "/");
      
      const fullJsonPath = join(jsonDir, type, jsonPath);
      await Bun.write(fullJsonPath, JSON.stringify(data, null, 2));
      filesByType[type].push(fullJsonPath);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }

  console.log(`Converted YAML files to JSON, grouped by type: ${Object.keys(filesByType).join(", ")}`);

  // Step 2: Merge JSON files per type and use quicktype
  console.log("\nStep 2: Merging JSON files and generating TypeScript models with quicktype...");
  
  // Ensure generated directory exists
  await Bun.write(join(generatedDir, ".gitkeep"), "");

  for (const [type, jsonFiles] of Object.entries(filesByType)) {
    if (jsonFiles.length === 0) continue;

    const typeName = `Raw${type.charAt(0).toUpperCase() + type.slice(1)}File`;
    const outputPath = join(generatedDir, `${typeName}.ts`);

    console.log(`\nGenerating ${typeName} from ${jsonFiles.length} JSON files...`);

    try {
      // Merge all JSON files into a single array file
      // quicktype will infer a unified type from all instances in the array
      console.log(`  Merging ${jsonFiles.length} JSON files...`);
      const allInstances: any[] = [];
      for (const jsonFile of jsonFiles) {
        try {
          const content = await Bun.file(jsonFile).text();
          const data = JSON.parse(content);
          allInstances.push(data);
        } catch (error) {
          console.warn(`  Warning: Failed to read ${jsonFile}:`, error);
        }
      }

      // Create a single merged JSON file (array of all instances)
      const mergedJsonPath = join(jsonDir, `${type}-merged.json`);
      await Bun.write(mergedJsonPath, JSON.stringify(allInstances, null, 2));
      console.log(`  Created merged file: ${mergedJsonPath} (${allInstances.length} instances)`);

      // Use quicktype on the merged file
      // When given an array, quicktype infers the item type
      const result = await spawn({
        cmd: [
          "npx",
          "quicktype",
          mergedJsonPath,
          "--lang",
          "typescript",
          "--just-types",
          "--top-level",
          typeName,
          "--out",
          outputPath,
        ],
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await result.exited;
      const stdout = await new Response(result.stdout).text();
      const stderr = await new Response(result.stderr).text();
      
      // Always show output for debugging
      if (stdout.trim()) {
        console.log("quicktype stdout:", stdout.substring(0, 500)); // First 500 chars
      }
      if (stderr.trim()) {
        console.error("quicktype stderr:", stderr.substring(0, 500)); // First 500 chars
      }
      
      if (exitCode === 0) {
        // Check if file actually exists
        const fileExists = await Bun.file(outputPath).exists();
        if (fileExists) {
          console.log(`✓ Generated ${outputPath}`);
        } else {
          console.error(`✗ File not created: ${outputPath}`);
          // Try writing stdout directly if quicktype output to stdout
          if (stdout.trim()) {
            await Bun.write(outputPath, stdout);
            console.log(`✓ Wrote output from stdout to ${outputPath}`);
          } else {
            console.error(`✗ No output from quicktype to write`);
          }
        }
      } else {
        console.error(`✗ Error generating ${typeName} (exit code ${exitCode})`);
      }
    } catch (error) {
      console.error(`✗ Error running quicktype for ${type}:`, error);
    }
  }

  console.log("\n✓ TypeScript model generation complete!");
  console.log(`Generated files in: ${generatedDir}`);
}

main().catch(console.error);

