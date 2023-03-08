import { ParseResult } from "..";
import {
  CleanClassFile,
  defaultParamType,
  defaultReturnType,
} from "../parsers/common";
import { CleanEventFile } from "../parsers/event";

export default function (
  parseResult: ParseResult<CleanEventFile>,
  ctx: "shared" | "client" | "server",
  symbolTable: { shared: Map<string, ParseResult<any>> }
) {
  const eventsLib = symbolTable[ctx].get("shared\\library\\Events.yaml")!
    .result as CleanClassFile;
  const eventFile = parseResult.result;

  // TODO use evetsFile.params
  const params = [
    {
      ...defaultParamType,
      name: "eventName",
      type: `"${eventFile.name}"`,
    },
    {
      ...defaultParamType,
      name: "callback",
      type: `(...args:any[]) => void`,
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
