import * as ts from "typescript";

// const s = ts.factory.createStringLiteral("hello", true);

const ns = ts.factory.createNamespaceExportDeclaration("Events");

const ns2 = ts.factory.createNamespaceExportDeclaration("test");

const cl = ts.factory.createClassDeclaration(
  undefined,
  undefined,
  "Events",
  undefined,
  undefined,
  []
);

const sourceFile: ts.SourceFile = ts.createSourceFile(
  "test.ts",
  "",
  ts.ScriptTarget.ES2015,
  true,
  ts.ScriptKind.TS
);
console.log(
  ts.createPrinter().printNode(ts.EmitHint.Unspecified, cl, sourceFile)
);
