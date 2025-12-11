import { buildTypes } from "../index";
import type { MainOptions } from "../index";
import { REPO_ZIP_EXTRACT_DIR } from "../config";
import generateExtProject from "../generators/ext-project";

export class LegacyPipelineWrapper {
  async run(options: MainOptions): Promise<void> {
    console.log("🔄 Running legacy pipeline wrapper");

    // Map new options to legacy options
    const legacyOptions: MainOptions = {
      outputDir: options.outputDir,
      generateTemplate: options.generateTemplate || false,
      modName: options.modName,
      rm: options.rm || false,
      refresh: options.refresh || false,
    };

    await buildTypes(
      REPO_ZIP_EXTRACT_DIR,
      legacyOptions.outputDir,
      legacyOptions.generateTemplate,
      undefined,
      legacyOptions.modName
    );

    if (legacyOptions.generateTemplate && legacyOptions.modName) {
      await generateExtProject(
        legacyOptions.modName,
        legacyOptions.refresh || false,
        legacyOptions.outputDir
      );
    }
  }
}
