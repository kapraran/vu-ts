/**
 * YAML file reading utilities
 */

import YAML from "yaml";

/**
 * Reads and parses a YAML file
 * @param filePath - Path to the YAML file
 * @returns Parsed YAML data
 */
export async function readYamlData(filePath: string) {
  const contents = await Bun.file(filePath).text();
  return YAML.parse(contents);
}
