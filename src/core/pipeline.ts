/**
 * Pipeline configuration mapping YAML types to their parser/transformer/generator functions
 */

import parseClassFile from "../parsers/class";
import parseEnumFile from "../parsers/enum";
import parseEventFile from "../parsers/event";
import parseHookFile from "../parsers/hook";
import parseLibraryFile from "../parsers/library";
import generateClassFile from "../generators/class";
import generateEnumFile from "../generators/enum";
import eventTransformer from "../transformers/event";
import hookTransformer from "../transformers/hook";
import classTransformer from "../transformers/class";

/**
 * Pipeline configuration that maps YAML types to their processing functions.
 * Each pipeline consists of:
 * - parser: Transforms raw YAML into structured data
 * - transformer: Modifies data for specific contexts (optional)
 * - generator: Creates TypeScript code from data (optional)
 */

type PipelineEntry = {
  parser: Function;
  transformer?: Function;
  generator?: Function;
};

export const pipelineMap: Record<string, PipelineEntry> = {
  event: {
    parser: parseEventFile,
    transformer: eventTransformer,
  },
  hook: {
    parser: parseHookFile,
    transformer: hookTransformer,
  },
  library: {
    parser: parseLibraryFile,
    generator: generateClassFile,
  },
  enum: {
    parser: parseEnumFile,
    generator: generateEnumFile,
  },
  class: {
    parser: parseClassFile,
    transformer: classTransformer,
    generator: generateClassFile,
  },
};
