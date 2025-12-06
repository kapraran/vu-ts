import prettier from "prettier";

export function formatCode(code: string): string {
  return prettier.format(code, { parser: "typescript" });
}

export async function saveDeclarationFile(
  filePath: string,
  code: string
): Promise<void> {
  // const formattedCode = formatCode(code);

  await Bun.write(filePath, code);
}
