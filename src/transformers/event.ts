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

  // Remove generic Subscribe methods that accept eventName: string
  // These interfere with type validation by allowing any string
  eventsLib.methods = eventsLib.methods.filter(method => {
    if (method.name !== "Subscribe") return true;

    // Check if this is a generic Subscribe method with eventName: string
    const eventNameParam = method.params?.find(p => p.name === "eventName");
    return eventNameParam?.type !== "string";
  });

  // Build callback signature from event parameters
  // Add 'this: void' as first parameter to prevent tstl from adding implicit self parameter
  const callbackParams = eventFile.params.map((param) => {
    const type = fixTypeName(param.type);
    const nullable = param.nullable ? "| null" : "";
    // Handle table types - wrap in LuaTable if needed
    const finalType = param.table ? `LuaTable<string, ${type}>` : type;
    return `${fixParamName(param.name)}: ${finalType}${nullable}`;
  }).join(", ");

  const callbackType = eventFile.params.length > 0
    ? `(this: void, ${callbackParams}) => void`
    : `(this: void) => void`;

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
