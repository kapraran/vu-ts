import { ParseResult } from "..";
import {
  CleanClassFile,
  defaultParamType,
  defaultReturnType,
} from "../parsers/common";
import { CleanHookFile } from "../parsers/hook";
import { fixTypeName, fixParamName } from "../generators/common";

export default function (
  parseResult: ParseResult<CleanHookFile>,
  ctx: "shared" | "client" | "server",
  symbolTable: { shared: Map<string, ParseResult<any>> }
) {
  const hooksLib = symbolTable[ctx].get("shared\\library\\Hooks.yaml")!
    .result as CleanClassFile;
  const hookFile = parseResult.result;

  // Build callback signature from hook parameters
  // Add 'this: void' as first parameter to prevent tstl from adding implicit self parameter
  // hookCtx: HookContext is always the first parameter after 'this: void'
  const hookParams = hookFile.params.map((param) => {
    const type = fixTypeName(param.type);
    const nullable = param.nullable ? "| null" : "";
    // Handle table types - wrap in LuaTable if needed
    const finalType = param.table ? `LuaTable<string, ${type}>` : type;
    return `${fixParamName(param.name)}: ${finalType}${nullable}`;
  }).join(", ");

  // Build callback return type from hook's return type
  let returnType = "void";
  if (hookFile.returns) {
    const type = fixTypeName(hookFile.returns.type);
    const nullable = hookFile.returns.nullable ? "| null" : "";
    // Handle table return types - wrap in LuaTable if needed
    returnType = hookFile.returns.table
      ? `LuaTable<string, ${type}>${nullable}`
      : `${type}${nullable}`;
  }

  // Build callback type with hookCtx as first parameter after 'this: void'
  let callbackType: string;
  if (hookFile.params.length > 0) {
    callbackType = `(this: void, hookCtx: HookContext, ${hookParams}) => ${returnType}`;
  } else {
    callbackType = `(this: void, hookCtx: HookContext) => ${returnType}`;
  }

  const params = [
    {
      ...defaultParamType,
      name: "hookName",
      type: `"${hookFile.name}"`,
    },
    {
      ...defaultParamType,
      name: "priority",
      type: "number",
    },
    {
      ...defaultParamType,
      name: "callback",
      type: callbackType,
    },
  ];

  hooksLib.methods = hooksLib.methods.concat([
    {
      name: "Install",
      description: hookFile.description,
      params,
      returns: [
        {
          ...defaultReturnType,
          type: "Hook",
        },
      ],
    },
  ]);
}

