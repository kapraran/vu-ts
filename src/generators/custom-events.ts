import { fixTypeName, fixParamName } from "./common";
import type { CustomEvent, CustomEventParam } from "../types/CustomEvent";

/**
 * Generate TypeScript declaration code for custom events that extend the Events namespace
 * @param events Array of custom event definitions for a specific context
 * @returns TypeScript declaration code using declaration merging
 */
export function generateCustomEventsDeclarations(events: CustomEvent[]): string {
  if (events.length === 0) {
    return `// Custom Events - Extend Events namespace with your mod's events
declare namespace Events {
}
`;
  }

  const declarations = events.map((event) => {
    // Build callback parameters from event parameters
    const callbackParams = event.params?.map((param) => {
      const type = fixTypeName(param.type);
      const nullable = param.nullable ? "| null" : "";
      const finalType = param.table ? `LuaTable<string, ${type}>` : type;
      return `${fixParamName(param.name)}: ${finalType}${nullable}`;
    }).join(", ") || "";

    // Build callback type signature
    const callbackType = callbackParams
      ? `(this: void, ${callbackParams}) => void`
      : `(this: void) => void`;

    // Build dispatch parameters (same as callback params but without 'this: void')
    const dispatchParams = callbackParams || "";

    // Generate Subscribe overload
    const subscribeOverload = `  function Subscribe(
    eventName: "${event.name}",
    callback: ${callbackType}
  ): Event;`;

    // Generate Dispatch overload
    const dispatchOverload = dispatchParams
      ? `  function Dispatch(
    eventName: "${event.name}",
    ${dispatchParams}
  ): void;`
      : `  function Dispatch(
    eventName: "${event.name}"
  ): void;`;

    return `${subscribeOverload}

${dispatchOverload}`;
  }).join("\n\n");

  return `// Custom Events - Extend Events namespace with your mod's events
// This file uses TypeScript declaration merging to add custom events to the Events namespace
declare namespace Events {
${declarations}
}
`;
}

