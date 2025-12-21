/**
 * CLI Service for Custom NetEvents Management
 * Handles adding, removing, and listing custom netevents for mods
 */

import { existsSync } from "fs";
import { join, resolve } from "path";
import {
  generateCustomNetEventsDeclarations,
  type NetEventContext,
} from "./generators/custom-netevents";
import type {
  CustomNetEvent,
  CustomNetEventParam,
} from "./types/CustomNetEvent";
import { detectModRoot, validateModRoot } from "./utils/mod-detection";

export interface NetEventAddCommandOptions {
  context: NetEventContext;
  name: string;
  params?: string[];
  modRoot?: string;
}

export interface NetEventRemoveCommandOptions {
  context: NetEventContext;
  name: string;
  modRoot?: string;
}

export interface NetEventListCommandOptions {
  context?: NetEventContext;
  modRoot?: string;
}

const CUSTOM_EVENTS_JSON = "custom-events.json";
const TYPES_D_TS = "types.d.ts";

const GENERATED_BLOCK_BEGIN = "// BEGIN VU-TS CUSTOM NETEVENTS (generated)";
const GENERATED_BLOCK_END = "// END VU-TS CUSTOM NETEVENTS (generated)";

type CustomConfigAny = Record<string, any>;

function validateContext(context: string): context is NetEventContext {
  return context === "client" || context === "server";
}

function validateNetEventName(name: string): void {
  if (!name || name.trim().length === 0)
    throw new Error("NetEvent name cannot be empty");
  if (name.includes("\n") || name.includes("\r")) {
    throw new Error("NetEvent name cannot contain newlines");
  }
}

/**
 * Parse parameter string in format "name:type" or "name:type|nullable"
 */
function parseParam(paramStr: string): CustomNetEventParam {
  const [name, typeStr] = paramStr.split(":");

  if (!name || !typeStr) {
    throw new Error(
      `Invalid parameter format: "${paramStr}". Expected format: "name:type"`
    );
  }

  const trimmedType = typeStr.trim();
  const nullable =
    trimmedType.endsWith("| null") || trimmedType.endsWith("|null");
  const baseType = nullable
    ? trimmedType.replace(/\|\s*null$/, "").trim()
    : trimmedType;

  return {
    name: name.trim(),
    type: baseType,
    nullable: nullable || undefined,
  };
}

async function loadConfig(modRoot: string): Promise<CustomConfigAny> {
  const configPath = join(modRoot, CUSTOM_EVENTS_JSON);
  if (!existsSync(configPath)) {
    return {
      client: [],
      server: [],
      shared: [],
      neteventsClient: [],
      neteventsServer: [],
    };
  }

  const content = await Bun.file(configPath).text();
  const parsed = JSON.parse(content) as CustomConfigAny;

  // Ensure keys exist (and preserve unknown keys)
  parsed.client ??= [];
  parsed.server ??= [];
  parsed.shared ??= [];
  parsed.neteventsClient ??= [];
  parsed.neteventsServer ??= [];

  return parsed;
}

async function saveConfig(
  modRoot: string,
  config: CustomConfigAny
): Promise<void> {
  const configPath = join(modRoot, CUSTOM_EVENTS_JSON);
  await Bun.write(configPath, JSON.stringify(config, null, 2) + "\n");
}

function getNetEventsArray(
  config: CustomConfigAny,
  ctx: NetEventContext
): CustomNetEvent[] {
  return (
    ctx === "client" ? config.neteventsClient : config.neteventsServer
  ) as CustomNetEvent[];
}

function setNetEventsArray(
  config: CustomConfigAny,
  ctx: NetEventContext,
  value: CustomNetEvent[]
): void {
  if (ctx === "client") config.neteventsClient = value;
  else config.neteventsServer = value;
}

async function upsertCustomNetEventsIntoTypesDts(
  modRoot: string,
  ctx: NetEventContext,
  config: CustomConfigAny
): Promise<void> {
  const typesDPath = join(modRoot, "ext-ts", ctx, TYPES_D_TS);
  if (!existsSync(typesDPath)) {
    throw new Error(
      `types.d.ts not found at ${typesDPath}. Make sure you're pointing at a generated mod template.`
    );
  }

  // Get own NetEvents (full declarations) and opposite NetEvents (Subscribe only)
  const ownNetEvents = getNetEventsArray(config, ctx);
  const oppositeContext: NetEventContext = ctx === "client" ? "server" : "client";
  const oppositeNetEvents = getNetEventsArray(config, oppositeContext);

  const content = await Bun.file(typesDPath).text();
  const generatedBody = generateCustomNetEventsDeclarations(
    ctx,
    ownNetEvents,
    oppositeNetEvents
  ).trimEnd();
  const generatedBlock =
    `${GENERATED_BLOCK_BEGIN}\n` +
    `// Typed custom NetEvents for this folder\n` +
    `${generatedBody}\n` +
    `${GENERATED_BLOCK_END}\n`;

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(
    `${esc(GENERATED_BLOCK_BEGIN)}[\\s\\S]*?${esc(GENERATED_BLOCK_END)}\\n?`,
    "g"
  );

  const newContent = blockRegex.test(content)
    ? content.replace(blockRegex, generatedBlock)
    : content.trimEnd() + "\n\n" + generatedBlock;

  await Bun.write(typesDPath, newContent);
}

/**
 * Regenerate both client and server types.d.ts files with updated NetEvent declarations
 */
async function regenerateAllNetEventTypes(
  modRoot: string,
  config: CustomConfigAny
): Promise<void> {
  await upsertCustomNetEventsIntoTypesDts(modRoot, "client", config);
  await upsertCustomNetEventsIntoTypesDts(modRoot, "server", config);
}

function resolveModRootOrThrow(providedModRoot?: string): string {
  let modRoot: string | null;
  if (providedModRoot) {
    modRoot = resolve(providedModRoot);
    if (!validateModRoot(modRoot)) {
      throw new Error(
        `Invalid mod directory: "${modRoot}". Directory must contain ext-ts/ and typings/ folders.`
      );
    }
    return modRoot;
  }

  modRoot = detectModRoot();
  if (!modRoot || !validateModRoot(modRoot)) {
    throw new Error(
      "Not in a mod directory. Please run this command from within a mod project directory " +
        "(should contain ext-ts/ and typings/ folders), or use --mod-root to specify the directory."
    );
  }
  return modRoot;
}

export async function executeNetEventAddCommand(
  options: NetEventAddCommandOptions
): Promise<void> {
  const { context, name, params = [], modRoot: providedModRoot } = options;

  if (!validateContext(context)) {
    throw new Error(
      `Invalid context: "${context}". Must be one of: client, server`
    );
  }
  validateNetEventName(name);

  const modRoot = resolveModRootOrThrow(providedModRoot);
  const config = await loadConfig(modRoot);

  const arr = getNetEventsArray(config, context);
  if (arr.some((e) => e.name === name)) {
    throw new Error(`NetEvent "${name}" already exists in ${context} context`);
  }

  const parsedParams = params.map(parseParam);
  const newEvent: CustomNetEvent = {
    name,
    params: parsedParams.length > 0 ? parsedParams : undefined,
  };

  arr.push(newEvent);
  setNetEventsArray(config, context, arr);
  await saveConfig(modRoot, config);

  // Regenerate both client and server types.d.ts files
  await regenerateAllNetEventTypes(modRoot, config);

  console.log(`✓ Added netevent "${name}" to ${context} context`);
}

export async function executeNetEventRemoveCommand(
  options: NetEventRemoveCommandOptions
): Promise<void> {
  const { context, name, modRoot: providedModRoot } = options;

  if (!validateContext(context)) {
    throw new Error(
      `Invalid context: "${context}". Must be one of: client, server`
    );
  }
  validateNetEventName(name);

  const modRoot = resolveModRootOrThrow(providedModRoot);
  const config = await loadConfig(modRoot);

  const arr = getNetEventsArray(config, context);
  const idx = arr.findIndex((e) => e.name === name);
  if (idx === -1) {
    throw new Error(`NetEvent "${name}" not found in ${context} context`);
  }
  arr.splice(idx, 1);
  setNetEventsArray(config, context, arr);
  await saveConfig(modRoot, config);

  // Regenerate both client and server types.d.ts files
  await regenerateAllNetEventTypes(modRoot, config);

  console.log(`✓ Removed netevent "${name}" from ${context} context`);
}

export async function executeNetEventListCommand(
  options: NetEventListCommandOptions = {}
): Promise<void> {
  const { context, modRoot: providedModRoot } = options;

  if (context && !validateContext(context)) {
    throw new Error(
      `Invalid context: "${context}". Must be one of: client, server`
    );
  }

  const modRoot = resolveModRootOrThrow(providedModRoot);
  const config = await loadConfig(modRoot);

  // Keep the generated types blocks in sync even when just listing
  await regenerateAllNetEventTypes(modRoot, config);

  const contextsToShow: NetEventContext[] = context
    ? [context]
    : ["client", "server"];
  let hasAny = false;

  for (const ctx of contextsToShow) {
    const arr = getNetEventsArray(config, ctx);
    if (arr.length === 0) continue;
    hasAny = true;
    console.log(
      `\n${ctx.toUpperCase()} (${arr.length} netevent${
        arr.length !== 1 ? "s" : ""
      }):`
    );
    for (const evt of arr) {
      console.log(`  • ${evt.name}`);
      if (evt.params?.length) {
        const paramsStr = evt.params
          .map((p) => `${p.name}: ${p.type}${p.nullable ? " | null" : ""}`)
          .join(", ");
        console.log(`    Parameters: ${paramsStr}`);
      }
    }
  }

  if (!hasAny) {
    console.log(
      context
        ? `No custom netevents found in ${context} context.`
        : "No custom netevents found."
    );
  }
}
