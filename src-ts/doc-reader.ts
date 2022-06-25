// export async function getAllDocsFilepaths(docsFilePath: string) {
//   const namespaces = ["fb", "shared", "server", "client"];
//   const yamlDirs = namespaces.map((ns) => )

//   for (const ns of namespaces) {
//     await buildNamespaceTypings(ns);
//     await genTypingsCode(symbolTable[ns], ns);
//   }
// }

class NamespaceReader {
  constructor(public readonly ns: string, public readonly subPaths: string[]) {}
}
