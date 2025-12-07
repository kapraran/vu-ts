import prettier from "prettier";

export function formatCode(code: string): string {
  return prettier.format(code, { parser: "typescript" });
}

export async function saveDeclarationFile(
  filePath: string,
  code: string
): Promise<void> {
  // Add reference to TypeScriptToLua language extensions for LuaTable, LuaMultiReturn, etc.
  const codeWithReference = `/// <reference types="@typescript-to-lua/language-extensions" />

${code}`;
  // const formattedCode = formatCode(codeWithReference);

  await Bun.write(filePath, codeWithReference);
}
