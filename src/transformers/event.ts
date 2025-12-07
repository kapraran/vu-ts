import { ParseResult } from "..";
import {
  CleanClassFile,
  defaultParamType,
  defaultReturnType,
} from "../parsers/common";
import { CleanEventFile } from "../parsers/event";
import { fixTypeName, fixParamName } from "../generators/common";

export default function (
  parseResult: ParseResult<CleanEventFile>,
  ctx: "shared" | "client" | "server",
  symbolTable: { shared: Map<string, ParseResult<any>> }
) {
  const eventsLib = symbolTable[ctx].get("shared\\library\\Events.yaml")!
    .result as CleanClassFile;
  const eventFile = parseResult.result;

  // Build callback signature from event parameters
  const callbackParams = eventFile.params.map((param) => {
    const type = fixTypeName(param.type);
    const nullable = param.nullable ? "| null" : "";
    // Handle table types - wrap in LuaTable if needed
    const finalType = param.table ? `LuaTable<string, ${type}>` : type;
    return `${fixParamName(param.name)}: ${finalType}${nullable}`;
  }).join(", ");

  const callbackType = eventFile.params.length > 0
    ? `(${callbackParams}) => void`
    : `() => void`;

  const params = [
    {
      ...defaultParamType,
      name: "eventName",
      type: `"${eventFile.name}"`,
    },
    {
      ...defaultParamType,
      name: "callback",
      type: callbackType,
    },
  ];

  eventsLib.methods = eventsLib.methods.concat([
    {
      name: "Subscribe",
      description: eventFile.description,
      params,
      returns: [
        {
          ...defaultReturnType,
          type: "Event",
        },
      ],
    },
  ]);
}
