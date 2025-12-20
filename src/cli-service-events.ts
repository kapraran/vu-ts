/**
 * CLI Service for Custom Events Management
 * Handles adding, removing, and listing custom events for mods
 */

import { join, resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { detectModRoot, validateModRoot } from "./utils/mod-detection";
import { generateCustomEventsDeclarations } from "./generators/custom-events";
import type { CustomEvent, CustomEventsConfig, CustomEventParam } from "./types/CustomEvent";
import { saveDeclarationFile } from "./utils";

export type EventContext = "client" | "server" | "shared";

export interface EventAddCommandOptions {
  context: EventContext;
  name: string;
  params?: string[];
  modRoot?: string;
}

export interface EventRemoveCommandOptions {
  context: EventContext;
  name: string;
  modRoot?: string;
}

export interface EventListCommandOptions {
  context?: EventContext;
  modRoot?: string;
}

const CUSTOM_EVENTS_JSON = "custom-events.json";
const CUSTOM_EVENTS_D_TS = "custom-events.d.ts";

/**
 * Parse parameter string in format "name:type" or "name:type|nullable"
 */
function parseParam(paramStr: string): CustomEventParam {
  const [name, typeStr] = paramStr.split(":");
  
  if (!name || !typeStr) {
    throw new Error(`Invalid parameter format: "${paramStr}". Expected format: "name:type"`);
  }

  // Check if type ends with "| null" or "|null" for nullable
  const trimmedType = typeStr.trim();
  const nullable = trimmedType.endsWith("| null") || trimmedType.endsWith("|null");
  const baseType = nullable 
    ? trimmedType.replace(/\|\s*null$/, "").trim()
    : trimmedType;

  return {
    name: name.trim(),
    type: baseType,
    nullable: nullable || undefined,
  };
}

/**
 * Load custom events configuration from JSON file
 */
async function loadCustomEventsConfig(modRoot: string): Promise<CustomEventsConfig> {
  const configPath = join(modRoot, CUSTOM_EVENTS_JSON);
  
  if (!existsSync(configPath)) {
    return {
      client: [],
      server: [],
      shared: [],
    };
  }

  const content = await Bun.file(configPath).text();
  return JSON.parse(content) as CustomEventsConfig;
}

/**
 * Save custom events configuration to JSON file
 */
async function saveCustomEventsConfig(
  modRoot: string,
  config: CustomEventsConfig
): Promise<void> {
  const configPath = join(modRoot, CUSTOM_EVENTS_JSON);
  await Bun.write(configPath, JSON.stringify(config, null, 2) + "\n");
}

/**
 * Generate custom-events.d.ts file for a specific context
 */
async function generateCustomEventsFile(
  modRoot: string,
  context: EventContext,
  events: CustomEvent[]
): Promise<void> {
  const outputPath = join(modRoot, "ext-ts", context, CUSTOM_EVENTS_D_TS);
  const declarations = generateCustomEventsDeclarations(events);
  await saveDeclarationFile(outputPath, declarations);
}

/**
 * Ensure types.d.ts includes reference to custom-events.d.ts
 */
async function ensureCustomEventsReference(modRoot: string, context: EventContext): Promise<void> {
  const typesDPath = join(modRoot, "ext-ts", context, "types.d.ts");
  
  if (!existsSync(typesDPath)) {
    throw new Error(`types.d.ts not found at ${typesDPath}. Make sure you're in a valid mod directory.`);
  }

  const content = await Bun.file(typesDPath).text();
  const reference = `/// <reference path="./custom-events.d.ts" />`;
  
  // Check if reference already exists
  if (content.includes(`custom-events.d.ts`)) {
    return;
  }

  // Add reference at the end of the file
  const newContent = content.trimEnd() + "\n" + reference + "\n";
  await Bun.write(typesDPath, newContent);
}

/**
 * Validate event name format
 */
function validateEventName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Event name cannot be empty");
  }

  // Basic validation - can be enhanced later
  if (name.includes("\n") || name.includes("\r")) {
    throw new Error("Event name cannot contain newlines");
  }
}

/**
 * Validate context is one of the allowed values
 */
function validateContext(context: string): context is EventContext {
  return context === "client" || context === "server" || context === "shared";
}

/**
 * Execute the 'event add' command
 */
export async function executeEventAddCommand(options: EventAddCommandOptions): Promise<void> {
  const { context, name, params = [], modRoot: providedModRoot } = options;

  // Validate context
  if (!validateContext(context)) {
    throw new Error(`Invalid context: "${context}". Must be one of: client, server, shared`);
  }

  // Validate event name
  validateEventName(name);

  // Get mod root - use provided path or detect from current directory
  let modRoot: string | null;
  if (providedModRoot) {
    modRoot = resolve(providedModRoot);
    if (!validateModRoot(modRoot)) {
      throw new Error(
        `Invalid mod directory: "${modRoot}". Directory must contain ext-ts/ and typings/ folders.`
      );
    }
  } else {
    modRoot = detectModRoot();
    if (!modRoot || !validateModRoot(modRoot)) {
      throw new Error(
        "Not in a mod directory. Please run this command from within a mod project directory " +
        "(should contain ext-ts/ and typings/ folders), or use --mod-root to specify the directory."
      );
    }
  }

  // Load existing config
  const config = await loadCustomEventsConfig(modRoot);

  // Check if event already exists in this context
  const existingIndex = config[context].findIndex((e) => e.name === name);
  if (existingIndex !== -1) {
    throw new Error(`Event "${name}" already exists in ${context} context`);
  }

  // Parse parameters
  const parsedParams = params.map(parseParam);

  // Create new event
  const newEvent: CustomEvent = {
    name,
    params: parsedParams.length > 0 ? parsedParams : undefined,
  };

  // Add to config
  config[context].push(newEvent);

  // Save config
  await saveCustomEventsConfig(modRoot, config);

  // Generate .d.ts file
  await generateCustomEventsFile(modRoot, context, config[context]);

  // Ensure types.d.ts references custom-events.d.ts
  await ensureCustomEventsReference(modRoot, context);

  console.log(`✓ Added event "${name}" to ${context} context`);
  if (parsedParams.length > 0) {
    console.log(`  Parameters: ${parsedParams.map((p) => `${p.name}: ${p.type}${p.nullable ? " | null" : ""}`).join(", ")}`);
  }
}

/**
 * Execute the 'event remove' command
 */
export async function executeEventRemoveCommand(options: EventRemoveCommandOptions): Promise<void> {
  const { context, name, modRoot: providedModRoot } = options;

  // Validate context
  if (!validateContext(context)) {
    throw new Error(`Invalid context: "${context}". Must be one of: client, server, shared`);
  }

  // Get mod root - use provided path or detect from current directory
  let modRoot: string | null;
  if (providedModRoot) {
    modRoot = resolve(providedModRoot);
    if (!validateModRoot(modRoot)) {
      throw new Error(
        `Invalid mod directory: "${modRoot}". Directory must contain ext-ts/ and typings/ folders.`
      );
    }
  } else {
    modRoot = detectModRoot();
    if (!modRoot || !validateModRoot(modRoot)) {
      throw new Error(
        "Not in a mod directory. Please run this command from within a mod project directory " +
        "(should contain ext-ts/ and typings/ folders), or use --mod-root to specify the directory."
      );
    }
  }

  // Load existing config
  const config = await loadCustomEventsConfig(modRoot);

  // Find and remove event
  const index = config[context].findIndex((e) => e.name === name);
  if (index === -1) {
    throw new Error(`Event "${name}" not found in ${context} context`);
  }

  config[context].splice(index, 1);

  // Save config
  await saveCustomEventsConfig(modRoot, config);

  // Regenerate .d.ts file (may be empty now)
  await generateCustomEventsFile(modRoot, context, config[context]);

  console.log(`✓ Removed event "${name}" from ${context} context`);
}

/**
 * Execute the 'event list' command
 */
export async function executeEventListCommand(options: EventListCommandOptions = {}): Promise<void> {
  const { context, modRoot: providedModRoot } = options;

  // Validate context if provided
  if (context && !validateContext(context)) {
    throw new Error(`Invalid context: "${context}". Must be one of: client, server, shared`);
  }

  // Get mod root - use provided path or detect from current directory
  let modRoot: string | null;
  if (providedModRoot) {
    modRoot = resolve(providedModRoot);
    if (!validateModRoot(modRoot)) {
      throw new Error(
        `Invalid mod directory: "${modRoot}". Directory must contain ext-ts/ and typings/ folders.`
      );
    }
  } else {
    modRoot = detectModRoot();
    if (!modRoot || !validateModRoot(modRoot)) {
      throw new Error(
        "Not in a mod directory. Please run this command from within a mod project directory " +
        "(should contain ext-ts/ and typings/ folders), or use --mod-root to specify the directory."
      );
    }
  }

  // Load config
  const config = await loadCustomEventsConfig(modRoot);

  // Filter contexts if specified
  const contextsToShow: EventContext[] = context ? [context] : ["client", "server", "shared"];

  let hasEvents = false;

  for (const ctx of contextsToShow) {
    const events = config[ctx];
    if (events.length > 0) {
      hasEvents = true;
      console.log(`\n${ctx.toUpperCase()} (${events.length} event${events.length !== 1 ? "s" : ""}):`);
      for (const event of events) {
        console.log(`  • ${event.name}`);
        if (event.params && event.params.length > 0) {
          const paramsStr = event.params
            .map((p) => `${p.name}: ${p.type}${p.nullable ? " | null" : ""}`)
            .join(", ");
          console.log(`    Parameters: ${paramsStr}`);
        }
      }
    }
  }

  if (!hasEvents) {
    const msg = context
      ? `No custom events found in ${context} context.`
      : "No custom events found.";
    console.log(msg);
  }
}

