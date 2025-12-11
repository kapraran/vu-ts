import YAML from "yaml";

export async function readYamlData(filePath: string) {
  const contents = await Bun.file(filePath).text();
  return YAML.parse(contents);
}
