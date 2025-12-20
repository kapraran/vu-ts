import { ParseResult } from "..";
import { CleanClassFile } from "../parsers/common";

export default function (
  parseResult: ParseResult<CleanClassFile>,
  ctx: "shared" | "client" | "server",
  symbolTable: { shared: Map<string, ParseResult<any>> }
) {
  const classFile = parseResult.result;

  // Only transform HookContext class to make it generic
  if (classFile.name === "HookContext") {
    // Check if already has generics (to avoid double transformation)
    if (!classFile.generics) {
      // Use any[] as default for TPassArgs (tuple type for variadic args)
      classFile.generics = {
        TCallReturn: "any",
        TPassArgs: "any[]",
      };
    }

    // Update the Pass method to use TPassArgs generic with rest parameter
    const passMethod = classFile.methods.find((m) => m.name === "Pass");
    if (passMethod && passMethod.params.length > 0) {
      const argsParam = passMethod.params[0];
      if (argsParam.name === "args") {
        argsParam.type = "TPassArgs";
        argsParam.variadic = true;
      }
    }

    // Update Return(returnValue) method to use TCallReturn generic
    const returnMethod = classFile.methods.find(
      (m) => m.name === "Return" && m.params.length > 0
    );
    if (returnMethod && returnMethod.params.length > 0) {
      const returnValueParam = returnMethod.params[0];
      if (returnValueParam.name === "returnValue") {
        returnValueParam.type = "TCallReturn";
      }
    }

    // Update Call method to use TCallReturn generic
    const callMethod = classFile.methods.find((m) => m.name === "Call");
    if (callMethod && callMethod.returns.length > 0) {
      callMethod.returns[0].type = "TCallReturn";
    }
  }
}
