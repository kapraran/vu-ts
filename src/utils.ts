import { ensureFile, writeFile } from "fs-extra";
import prettier from "prettier";

export async function saveDeclarationFile(
  filePath: string,
  code: string
): Promise<void> {
  const formattedCode: string = prettier.format(code, { parser: "typescript" });

  await ensureFile(filePath);
  await writeFile(filePath, formattedCode, "utf8");
}
