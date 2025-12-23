/**
 * Type definitions for the VU TypeScript type generator
 */

export type typeNamespace = "client" | "server" | "shared" | "fb";

export interface MainOptions {
  /** Optional custom output directory for generated type definitions */
  outputDir?: string;
  /** Generate a complete mod template structure */
  generateTemplate?: boolean;
  /** Name of the mod (required when generating templates) */
  modName?: string;
  /** Remove existing folder before generation (forces overwrite) */
  rm?: boolean;
  /** Update existing files while preserving user code */
  refresh?: boolean;
}

export type ParseResult<T extends unknown> = {
  /** Original file path */
  filePath: string;
  /** Type of the parsed data (e.g., 'class', 'event', 'enum') */
  type: string;
  /** Namespace context (client, server, shared, fb) */
  namespace: typeNamespace;
  /** Parsed result data */
  result: T;
};
