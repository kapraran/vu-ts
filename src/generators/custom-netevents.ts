import { fixParamName, fixTypeName } from "./common";
import type { CustomNetEvent } from "../types/CustomNetEvent";

export type NetEventContext = "client" | "server";

function buildParamsList(netEvent: CustomNetEvent): string {
  return (
    netEvent.params
      ?.map((param) => {
        const type = fixTypeName(param.type);
        const nullable = param.nullable ? "| null" : "";
        const finalType = param.table ? `LuaTable<string, ${type}>` : type;
        return `${fixParamName(param.name)}: ${finalType}${nullable}`;
      })
      .join(", ") || ""
  );
}

function buildCallbackType(paramsList: string, prefix: string): string {
  // prefix includes "this: void" and possibly "player: Player" or "userData: T"
  if (!paramsList) return `(${prefix}) => void`;
  return `(${prefix}, ${paramsList}) => void`;
}

export function generateCustomNetEventsDeclarations(
  ctx: NetEventContext,
  ownNetEvents: CustomNetEvent[],
  oppositeNetEvents: CustomNetEvent[] = []
): string {
  const allBlocks: string[] = [];

  // Generate full declarations for ownNetEvents (Subscribe + sending methods)
  if (ownNetEvents.length > 0) {
    const ownBlocks = ownNetEvents.map((evt) => {
      const paramsList = buildParamsList(evt);

      // Subscribe overloads
      const subscribeBase =
        ctx === "client"
          ? `  function Subscribe(
    eventName: "${evt.name}",
    callback: ${buildCallbackType(paramsList, "this: void")}
  ): NetEvent;`
          : `  function Subscribe(
    eventName: "${evt.name}",
    callback: ${buildCallbackType(paramsList, "this: void, player: Player")}
  ): NetEvent;`;

      // Sending overloads
      const clientSendOverloads =
        ctx === "client"
          ? [
              ["Send", false],
              ["SendLocal", false],
              ["SendUnreliable", false],
              ["SendUnreliableLocal", false],
              ["SendUnreliableOrdered", false],
              ["SendUnreliableOrderedLocal", false],
            ]
              .map(([method]) => {
                if (!paramsList) {
                  return `  function ${method}(
    eventName: "${evt.name}"
  ): void;`;
                }
                return `  function ${method}(
    eventName: "${evt.name}",
    ${paramsList}
  ): void;`;
              })
              .join("\n\n")
          : "";

      const serverBroadcastOverloads =
        ctx === "server"
          ? [
              "Broadcast",
              "BroadcastLocal",
              "BroadcastUnreliable",
              "BroadcastUnreliableLocal",
              "BroadcastUnreliableOrdered",
              "BroadcastUnreliableOrderedLocal",
            ]
              .map((method) => {
                if (!paramsList) {
                  return `  function ${method}(
    eventName: "${evt.name}"
  ): void;`;
                }
                return `  function ${method}(
    eventName: "${evt.name}",
    ${paramsList}
  ): void;`;
              })
              .join("\n\n")
          : "";

      const serverSendToOverloads =
        ctx === "server"
          ? [
              "SendTo",
              "SendToLocal",
              "SendUnreliableTo",
              "SendUnreliableToLocal",
              "SendUnreliableOrderedTo",
              "SendUnreliableOrderedToLocal",
            ]
              .map((method) => {
                if (!paramsList) {
                  return `  function ${method}(
    eventName: "${evt.name}",
    player: Player
  ): void;`;
                }
                return `  function ${method}(
    eventName: "${evt.name}",
    player: Player,
    ${paramsList}
  ): void;`;
              })
              .join("\n\n")
          : "";

      const sending =
        ctx === "client"
          ? clientSendOverloads
          : `${serverBroadcastOverloads}\n\n${serverSendToOverloads}`.trim();

      return `${subscribeBase}\n\n${sending}`.trim();
    });
    allBlocks.push(...ownBlocks);
  }

  // Generate Subscribe-only declarations for oppositeNetEvents
  if (oppositeNetEvents.length > 0) {
    const oppositeBlocks = oppositeNetEvents.map((evt) => {
      const paramsList = buildParamsList(evt);

      // Client context receiving from server: no player parameter
      // Server context receiving from client: player parameter as first arg
      const subscribeBase =
        ctx === "client"
          ? `  function Subscribe(
    eventName: "${evt.name}",
    callback: ${buildCallbackType(paramsList, "this: void")}
  ): NetEvent;`
          : `  function Subscribe(
    eventName: "${evt.name}",
    callback: ${buildCallbackType(paramsList, "this: void, player: Player")}
  ): NetEvent;`;

      return subscribeBase;
    });
    allBlocks.push(...oppositeBlocks);
  }

  if (allBlocks.length === 0) {
    return `declare namespace NetEvents {
}
`;
  }

  return `declare namespace NetEvents {
${allBlocks.join("\n\n")}
}
`;
}
