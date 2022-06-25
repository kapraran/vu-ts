import * as ts from "typescript";

const s = ts.factory.createStringLiteral("hello", true);

ts.factory.createNamespaceExportDeclaration("Events");

class TypeDeclaration {
  public generics: TypeDeclaration[];
}
