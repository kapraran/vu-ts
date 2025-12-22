import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { cwd } from "process";
import { loadAndRenderTemplate } from "../utils/template";

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
  // Get the template directory path (relative to this file)
  // import.meta.dir points to src/generators/, so go up to project root
  const templatesDir = join(
    import.meta.dir || __dirname,
    "..",
    "..",
    "templates",
    "mod-template"
  );

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
    join(TEMPLATE_PROJECT_DIR, ".vu-ts"),
    join(TEMPLATE_PROJECT_DIR, ".vu-ts", "typings"),
    join(TEMPLATE_PROJECT_DIR, ".vu-ts", "config"),
    join(TEMPLATE_PROJECT_DIR, ".vu-ts", "scripts"),
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
  const templateTypingsDir = join(TEMPLATE_PROJECT_DIR, ".vu-ts", "typings");
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

  // Generate config files (copy from template, no variables)
  const baseConfigTemplate = join(templatesDir, ".vu-ts", "config", "tsconfig.base.json");
  const baseConfigContent = await Bun.file(baseConfigTemplate).text();
  await Bun.write(
    join(TEMPLATE_PROJECT_DIR, ".vu-ts", "config", "tsconfig.base.json"),
    baseConfigContent
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
    // Generate tsconfig.json from template
    const tsconfigTemplate = join(templatesDir, "ext-ts", "tsconfig.json.template");
    const tsconfigContent = await loadAndRenderTemplate(tsconfigTemplate, {
      folder,
      hasSharedPath: folder !== "shared",
    });
    await Bun.write(
      join(EXT_TS_DIR, folder, "tsconfig.json"),
      tsconfigContent + "\n"
    );

    // Generate types.d.ts from template
    const typesDTemplate = join(templatesDir, "ext-ts", "types.d.ts.template");
    const typesDContent = await loadAndRenderTemplate(typesDTemplate, {
      types,
    });
    await Bun.write(
      join(EXT_TS_DIR, folder, "types.d.ts"),
      typesDContent + "\n"
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

  // Generate tstl-plugin.js (copy from template, no variables)
  const pluginTemplate = join(templatesDir, ".vu-ts", "config", "tstl-plugin.js");
  const pluginContent = await Bun.file(pluginTemplate).text();
  await Bun.write(join(TEMPLATE_PROJECT_DIR, ".vu-ts", "config", "tstl-plugin.js"), pluginContent);
  const pluginAction = refresh ? "Refreshed" : "Generated";
  console.log(`   ✓ ${pluginAction} tstl-plugin.js`);

  // Generate README.md (copy from template, no variables)
  const readmeTemplate = join(templatesDir, "README.md");
  const readmeContent = await Bun.file(readmeTemplate).text();
  await Bun.write(join(TEMPLATE_PROJECT_DIR, "README.md"), readmeContent);

  // Generate mod.json from template
  const modDisplayName = modName || "My first mod";
  const modJsonTemplate = join(templatesDir, "mod.json.template");
  const modJsonContent = await loadAndRenderTemplate(modJsonTemplate, {
    modDisplayName,
  });
  await Bun.write(join(TEMPLATE_PROJECT_DIR, "mod.json"), modJsonContent);

  // Generate watch.ts (copy from template, no variables)
  const watchTemplate = join(templatesDir, ".vu-ts", "scripts", "watch.ts");
  const watchContent = await Bun.file(watchTemplate).text();
  await Bun.write(join(TEMPLATE_PROJECT_DIR, ".vu-ts", "scripts", "watch.ts"), watchContent);

  // Generate package.json from template
  const packageName = modName
    ? `vu-mod-${modName.toLowerCase().replace(/\s+/g, "-")}`
    : "vu-mod";
  const packageJsonTemplate = join(templatesDir, "package.json.template");
  const packageJsonContent = await loadAndRenderTemplate(packageJsonTemplate, {
    packageName,
  });
  await Bun.write(join(TEMPLATE_PROJECT_DIR, "package.json"), packageJsonContent);

  // Generate .gitignore (copy from template, no variables)
  const gitignoreTemplate = join(templatesDir, ".gitignore");
  const gitignoreContent = await Bun.file(gitignoreTemplate).text();
  await Bun.write(join(TEMPLATE_PROJECT_DIR, ".gitignore"), gitignoreContent);

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
