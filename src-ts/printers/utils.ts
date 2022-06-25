import { ensureFile, writeFile } from "fs-extra";
import prettier from "prettier";

export async function saveDeclarationFile(
  filePath: string,
  code: string
): Promise<void> {
  await ensureFile(filePath);
  const formattedCode: string = prettier.format(code, { parser: "typescript" });
  await writeFile(filePath, formattedCode, "utf8");
}
