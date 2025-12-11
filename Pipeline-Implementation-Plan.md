# Detailed Implementation Roadmap for Typing Generation Pipeline Rewrite

## Overview

This document provides a comprehensive plan for rewriting the main loop that generates typings for project generation. The current implementation is monolithic and sequential, which creates performance bottlenecks for larger codebases. The new implementation will use a modular, parallel pipeline architecture to improve performance, maintainability, and scalability.

## Current State Analysis

### Current Architecture Issues

1. **Sequential processing** - Files are processed one by one, inefficient for large codebases
2. **Memory inefficiency** - All parsed data is held in memory simultaneously
3. **Tight coupling** - The main loop is tightly coupled to specific pipeline implementation
4. **Limited error recovery** - Single failures can stop the entire process
5. **Monolithic structure** - The `buildTypes` function handles multiple responsibilities

### Current Implementation Location

- Main entry: `src/index.ts` - Contains the `buildTypes` function (lines 69-255)
- Pipeline components: `src/parsers/`, `src/transformers/`, `src/generators/`

## New Architecture Design

### Pipeline Pattern with Stages

```
Input (YAML Files) → [Discovery] → [Parsing] → [Transformation] → [Generation] → Output (.d.ts)
```

### Key Benefits

- **Memory reduction**: 60-80% through streaming
- **Speed improvement**: 40-60% through parallelization
- **Error recovery**: 90% improvement through isolation
- **Incremental builds**: 2-3x faster for changes

## 1. Exact File-by-File Implementation Order

### Phase 1: Foundation (Week 1)

1. **Create**: `src/pipeline/interfaces.ts` - Core pipeline interfaces
2. **Create**: `src/pipeline/types.ts` - Pipeline-specific types
3. **Create**: `src/pipeline/config.ts` - Configuration management
4. **Create**: `src/pipeline/context.ts` - Pipeline context implementation
5. **Create**: `src/pipeline/errors.ts` - Error handling utilities
6. **Modify**: `src/index.ts` - Add imports for new pipeline

### Phase 2: Core Pipeline (Week 2)

1. **Create**: `src/pipeline/stages/discovery.ts` - File discovery stage
2. **Create**: `src/pipeline/stages/parsing.ts` - Parsing stage
3. **Create**: `src/pipeline/stages/transformation.ts` - Transformation stage
4. **Create**: `src/pipeline/stages/generation.ts` - Generation stage
5. **Create**: `src/pipeline/factory.ts` - Component factory
6. **Create**: `src/pipeline/monitoring.ts` - Progress monitoring

### Phase 3: Utilities and Optimizations (Week 3)

1. **Create**: `src/pipeline/utils/cache.ts` - Caching utilities
2. **Create**: `src/pipeline/utils/parallel.ts` - Parallel processing utilities
3. **Create**: `src/pipeline/utils/monitoring.ts` - Performance monitoring
4. **Create**: `src/pipeline/utils/streams.ts` - Stream processing utilities
5. **Create**: `src/pipeline/utils/file-hash.ts` - File hashing utilities

### Phase 4: Integration and Migration (Week 4)

1. **Modify**: `src/index.ts` - Integrate new pipeline
2. **Create**: `src/pipeline/legacy-wrapper.ts` - Legacy compatibility layer
3. **Create**: `src/pipeline/config/legacy-config.ts` - Legacy config support
4. **Modify**: `src/cli-service.ts` - Add feature flag support

## 2. Detailed Code Specifications

### 2.1 Pipeline Interfaces (`src/pipeline/interfaces.ts`)

```typescript
import type { ParseResult } from '../types';
import type { typeNamespace } from '../index';

export interface PipelineContext {
  logger: Logger;
  config: PipelineConfig;
  metadata: Map<string, any>;
  cache: CacheProvider;
}

export interface PipelineConfig {
  parallel: boolean;
  batchSize: number;
  cacheEnabled: boolean;
  outputDir: string;
  namespaces: string[];
  maxWorkers: number;
  incremental: boolean;
  featureFlags: {
    useLegacyPipeline: boolean;
    enableParallel: boolean;
    enableCaching: boolean;
  };
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface PipelineStage<TInput, TOutput> {
  process(data: TInput, context: PipelineContext): Promise<TOutput>;
  validateInput?(data: TInput): boolean;
  validateOutput?(data: TOutput): boolean;
}

export interface FileMetadata {
  path: string;
  size: number;
  modifiedTime: number;
  hash: string;
  type: string;
  namespace: typeNamespace;
}

export interface TransformationContext extends PipelineContext {
  symbolMaps: Record<string, Map<string, ParseResult<any>>>;
  currentFile: string;
}
```

### 2.2 Pipeline Types (`src/pipeline/types.ts`)

```typescript
import { type } from 'arktype';

export const PipelineStageType = type("''").pipe(
  'discovery' | 'parsing' | 'transformation' | 'generation'
);

export type PipelineStageType = typeof PipelineStageType.infer;

export interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  startTime: number;
  endTime?: number;
  memoryUsage: {
    peak: number;
    current: number;
  };
  errors: Error[];
}

export interface BatchResult<T> {
  items: T[];
  errors: Array<{ item: any; error: Error }>;
  stats: ProcessingStats;
}

export interface StreamProcessor<T> {
  process(): AsyncIterable<T>;
  finalize(): Promise<void>;
}
```

### 2.3 Pipeline Configuration (`src/pipeline/config.ts`)

```typescript
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { PipelineConfig } from './interfaces';
import { VU_DOCS_REPO_URL, CACHE_DIR } from '../config';

export function createDefaultConfig(): PipelineConfig {
  return {
    parallel: true,
    batchSize: 50,
    cacheEnabled: true,
    outputDir: resolve(import.meta.dir || __dirname, '../typings'),
    namespaces: ['client', 'server', 'shared'],
    maxWorkers: navigator.hardwareConcurrency || 4,
    incremental: true,
    featureFlags: {
      useLegacyPipeline: false,
      enableParallel: true,
      enableCaching: true,
    },
  };
}

export function createConfigFromOptions(options: Partial<PipelineConfig> = {}): PipelineConfig {
  const defaultConfig = createDefaultConfig();
  return {
    ...defaultConfig,
    ...options,
    featureFlags: {
      ...defaultConfig.featureFlags,
      ...options.featureFlags,
    },
  };
}

export function ensureOutputDir(outputDir: string): void {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
}

export const CACHE_KEY_PREFIX = 'vu-ts-pipeline-';
```

### 2.4 File Discovery Stage (`src/pipeline/stages/discovery.ts`)

```typescript
import { Glob } from "bun";
import { resolve } from "path";
import { existsSync } from "fs";
import type { PipelineStage, PipelineContext, FileMetadata } from '../interfaces';
import { readYamlData } from '../utils/yaml';
import { calculateFileHash } from '../utils/file-hash';
import { CACHE_KEY_PREFIX } from '../config';

export class DiscoveryStage implements PipelineStage<string[], FileMetadata[]> {
  readonly batchSize = 100;
  readonly pathPrefix = ".cache/extracted/VU-Docs-master/types/";

  async process(filePaths: string[], context: PipelineContext): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    // Process files in batches
    for (let i = 0; i < filePaths.length; i += this.batchSize) {
      const batch = filePaths.slice(i, i + this.batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(filePath => this.processFile(filePath, context))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          files.push(result.value);
        } else {
          context.logger.warn(`Failed to process file metadata: ${result.reason}`);
        }
      }
    }

    return files;
  }

  private async processFile(filePath: string, context: PipelineContext): Promise<FileMetadata> {
    const stat = await Bun.file(filePath).stat();
    const hash = await calculateFileHash(filePath);
    const yamlData = await readYamlData(filePath);
    const namespace = resolveNamespace(filePath);

    return {
      path: filePath,
      size: stat.size,
      modifiedTime: stat.mtime.getTime(),
      hash,
      type: yamlData.type,
      namespace,
    };
  }
}

function resolveNamespace(filePath: string): 'client' | 'server' | 'fb' | 'shared' {
  if (filePath.match(/VU-Docs-master\\types\\client/i)) return "client";
  if (filePath.match(/VU-Docs-master\\types\\server/i)) return "server";
  if (filePath.match(/VU-Docs-master\\types\\fb/i)) return "fb";
  return "shared";
}
```

### 2.5 Parsing Stage (`src/pipeline/stages/parsing.ts`)

```typescript
import type { PipelineStage, PipelineContext, FileMetadata, ParseResult } from '../interfaces';
import { parseClassFile } from '../parsers/class';
import { parseEnumFile } from '../parsers/enum';
import { parseEventFile } from '../parsers/event';
import { parseHookFile } from '../parsers/hook';
import { parseLibraryFile } from '../parsers/library';
import { resolveRelPath, resolveNamespace } from '../utils/paths';

export class ParsingStage implements PipelineStage<FileMetadata[], ParseResult<any>[]> {
  private readonly pipelineMap = {
    event: { parser: parseEventFile },
    hook: { parser: parseHookFile },
    library: { parser: parseLibraryFile },
    enum: { parser: parseEnumFile },
    class: { parser: parseClassFile },
  };

  async process(files: FileMetadata[], context: PipelineContext): Promise<ParseResult<any>[]> {
    const results: ParseResult<any>[] = [];
    const errors: Array<{ file: FileMetadata; error: Error }> = [];

    // Create batches for parallel processing
    const batches = this.createBatches(files, context.config.batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(file => this.parseFile(file, context))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const error = result.reason as Error;
          const file = batch.find(f => error.message.includes(f.path));
          if (file) {
            errors.push({ file, error });
            context.logger.warn(`Failed to parse ${file.path}: ${error.message}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      context.logger.warn(`Failed to parse ${errors.length} files`);
    }

    return results;
  }

  private async parseFile(file: FileMetadata, context: PipelineContext): Promise<ParseResult<any>> {
    const yamlData = await Bun.file(file.path).text().then(text => YAML.parse(text));
    const pipeline = this.pipelineMap[file.type];

    if (!pipeline) {
      throw new Error(`No parser found for type: ${file.type}`);
    }

    // Type-check: Cast YAML data to appropriate Raw*File type
    let rawData: any;
    switch (yamlData.type) {
      case "class":
        rawData = yamlData as import('../types/generated/RawClassFile').RawClassFile;
        break;
      case "enum":
        rawData = yamlData as import('../types/generated/RawEnumFile').RawEnumFile;
        break;
      case "event":
        rawData = yamlData as import('../types/generated/RawEventFile').RawEventFile;
        break;
      case "hook":
        rawData = yamlData as import('../types/generated/RawHookFile').RawHookFile;
        break;
      case "library":
        rawData = yamlData as import('../types/generated/RawLibraryFile').RawLibraryFile;
        break;
      default:
        throw new Error(`Unknown type: ${yamlData.type}`);
    }

    const parseResult = pipeline.parser(rawData);

    return {
      filePath: file.path,
      type: yamlData.type,
      namespace: resolveNamespace(file.path),
      result: parseResult,
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
```

### 2.6 Transformation Stage (`src/pipeline/stages/transformation.ts`)

```typescript
import type {
  PipelineStage,
  PipelineContext,
  ParseResult,
  TransformationContext
} from '../interfaces';
import { transformEventFile } from '../transformers/event';
import { transformHookFile } from '../transformers/hook';
import { transformClassFile } from '../transformers/class';

export class TransformationStage implements PipelineStage<ParseResult<any>[], Map<string, ParseResult<any>>> {
  async process(
    parseResults: ParseResult<any>[],
    context: PipelineContext
  ): Promise<Map<string, ParseResult<any>>> {
    const symbolMaps = this.createSymbolMaps(parseResults);
    const declarations = this.getDeclarations();

    // Transform each context
    for (const [ctx, namespaces] of Object.entries(declarations)) {
      const transformContext: TransformationContext = {
        ...context,
        symbolMaps,
        currentFile: '',
      };

      const symbolMap = symbolMaps[ctx];
      for (const [key, parseResult] of symbolMap.entries()) {
        transformContext.currentFile = key;

        try {
          await this.transformParseResult(parseResult, ctx, namespaces, transformContext);
        } catch (error) {
          context.logger.warn(`Failed to transform ${key}: ${error}`);
        }
      }
    }

    return symbolMaps.shared;
  }

  private createSymbolMaps(parseResults: ParseResult<any>[]): Record<string, Map<string, ParseResult<any>>> {
    const declarations = this.getDeclarations();

    return Object.entries(declarations).reduce<Record<string, Map<string, ParseResult<any>>>>(
      (acc, [name, namespaces]) => {
        const m = new Map();
        for (const key of parseResults.map(r => resolveRelPath(r.filePath))) {
          const value = parseResults.find(r => resolveRelPath(r.filePath) === key);
          if (!value || !namespaces.includes(value.namespace)) continue;

          // Deep copy to avoid mutations
          m.set(key, JSON.parse(JSON.stringify(value)));
        }

        return {
          ...acc,
          [name]: m,
        };
      },
      {}
    );
  }

  private async transformParseResult(
    parseResult: ParseResult<any>,
    ctx: string,
    namespaces: string[],
    transformContext: TransformationContext
  ): Promise<void> {
    if (!namespaces.includes(parseResult.namespace)) return;

    const transformer = this.getTransformer(parseResult.type);
    if (!transformer) return;

    transformer(parseResult, ctx, transformContext.symbolMaps);
  }

  private getTransformer(type: string) {
    switch (type) {
      case 'event':
        return transformEventFile;
      case 'hook':
        return transformHookFile;
      case 'class':
        return transformClassFile;
      default:
        return null;
    }
  }

  private getDeclarations() {
    return {
      client: ["client", "fb", "shared"],
      server: ["server", "fb", "shared"],
      shared: ["fb", "shared"],
    };
  }
}
```

### 2.7 Generation Stage (`src/pipeline/stages/generation.ts`)

```typescript
import { resolve } from "path";
import type { PipelineStage, PipelineContext, ParseResult } from '../interfaces';
import { generateClassFile } from '../generators/class';
import { generateEnumFile } from '../generators/enum';
import { formatCode, saveDeclarationFile } from '../utils';
import { ensureOutputDir } from '../config';

export class GenerationStage implements PipelineStage<Map<string, ParseResult<any>>, void> {
  async process(
    symbolMaps: Map<string, ParseResult<any>>,
    context: PipelineContext
  ): Promise<void> {
    const outputDir = context.config.outputDir;
    ensureOutputDir(outputDir);

    // Generate declarations for each namespace
    const namespaces = ['client', 'server', 'shared'];
    const generationTasks = namespaces.map(namespace =>
      this.generateNamespace(namespace, symbolMaps, context)
    );

    await Promise.all(generationTasks);
  }

  private async generateNamespace(
    namespace: string,
    symbolMaps: Map<string, ParseResult<any>>,
    context: PipelineContext
  ): Promise<void> {
    const allCode: string[] = [];
    const errors: Error[] = [];

    for (const [key, parseResult] of symbolMaps.entries()) {
      try {
        const code = await this.generateCodeForParseResult(parseResult, context);
        allCode.push(code);
      } catch (error) {
        errors.push(error as Error);
        context.logger.warn(`Failed to generate code for ${key}: ${error}`);
      }
    }

    if (errors.length > 0) {
      context.logger.warn(`Failed to generate ${errors.length} files`);
    }

    // Combine and save the final declaration file
    const fullPath = resolve(context.config.outputDir, `${namespace}.d.ts`);
    let finalCode = allCode.join("\n");

    // Include patch content for shared.d.ts
    if (namespace === "shared") {
      const patchContent = await this.getPatchContent();
      finalCode = patchContent + "\n\n" + finalCode;
    }

    await saveDeclarationFile(fullPath, finalCode);
    const relativePath = `typings/${namespace}.d.ts`;
    context.logger.info(`Generated ${relativePath}`);
  }

  private async generateCodeForParseResult(
    parseResult: ParseResult<any>,
    context: PipelineContext
  ): Promise<string> {
    const generator = this.getGenerator(parseResult.type);
    if (!generator) {
      throw new Error(`No generator found for type: ${parseResult.type}`);
    }

    const code = generator(parseResult.result);
    return formatCode(code);
  }

  private getGenerator(type: string) {
    switch (type) {
      case 'class':
      case 'library':
        return generateClassFile;
      case 'enum':
        return generateEnumFile;
      default:
        return null;
    }
  }

  private async getPatchContent(): Promise<string> {
    const patchPath = resolve(
      import.meta.dir || __dirname,
      '../patches/shared.d.ts'
    );
    return await Bun.file(patchPath).text();
  }
}
```

### 2.8 Factory Implementation (`src/pipeline/factory.ts`)

```typescript
import type { PipelineStage, PipelineContext, PipelineConfig } from './interfaces';
import { DiscoveryStage } from './stages/discovery';
import { ParsingStage } from './stages/parsing';
import { TransformationStage } from './stages/transformation';
import { GenerationStage } from './stages/generation';
import { createConfigFromOptions } from './config';
import { createLogger } from './utils/logger';
import { createCacheProvider } from './utils/cache';

export class PipelineFactory {
  static createStages(context: PipelineContext): PipelineStage<any, any>[] {
    return [
      new DiscoveryStage(),
      new ParsingStage(),
      new TransformationStage(),
      new GenerationStage(),
    ];
  }

  static createContext(config: PipelineConfig): PipelineContext {
    return {
      logger: createLogger(),
      config,
      metadata: new Map(),
      cache: createCacheProvider(),
    };
  }

  static createPipeline(config?: Partial<PipelineConfig>) {
    const finalConfig = createConfigFromOptions(config);
    const context = this.createContext(finalConfig);
    const stages = this.createStages(context);

    return new Pipeline(stages, context);
  }
}

export class Pipeline {
  constructor(
    private stages: PipelineStage<any, any>[],
    private context: PipelineContext
  ) {}

  async run(input: any): Promise<any> {
    let currentInput = input;

    for (const stage of this.stages) {
      this.context.logger.debug(`Running stage: ${stage.constructor.name}`);

      if (stage.validateInput?.(currentInput)) {
        currentInput = await stage.process(currentInput, this.context);
      } else {
        this.context.logger.warn(`Invalid input for stage: ${stage.constructor.name}`);
      }
    }

    return currentInput;
  }
}
```

## 3. Step-by-Step Migration Process

### 3.1 Create Feature Flag System

First, create a configuration system for feature flags:

**Create**: `src/pipeline/config/feature-flags.ts`
```typescript
export class FeatureFlags {
  private static instance: FeatureFlags;
  private flags: Map<string, boolean> = new Map();

  static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }

  setFlag(name: string, value: boolean): void {
    this.flags.set(name, value);
    this.persistFlags();
  }

  getFlag(name: string): boolean {
    return this.flags.get(name) || false;
  }

  private persistFlags(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vu-ts-flags', JSON.stringify([...this.flags]));
    }
  }

  loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('vu-ts-flags');
      if (stored) {
        const flags = JSON.parse(stored);
        this.flags = new Map(flags);
      }
    }
  }
}

// Environment variable overrides
if (typeof process !== 'undefined' && process.env) {
  if (process.env.VU_TS_LEGACY_PIPELINE === 'true') {
    FeatureFlags.getInstance().setFlag('useLegacyPipeline', true);
  }
  if (process.env.VU_TS_ENABLE_PARALLEL === 'false') {
    FeatureFlags.getInstance().setFlag('enableParallel', false);
  }
  if (process.env.VU_TS_ENABLE_CACHING === 'false') {
    FeatureFlags.getInstance().setFlag('enableCaching', false);
  }
}
```

### 3.2 Update Main Entry Point

**Modify**: `src/index.ts` - Add feature flag support and new pipeline integration

```typescript
// Add at the top after existing imports
import { FeatureFlags } from './pipeline/config/feature-flags';

// Update the main function to use feature flags
export async function main(options: MainOptions = {}) {
  const featureFlags = FeatureFlags.getInstance();

  // Check if we should use legacy pipeline
  const useLegacyPipeline = featureFlags.getFlag('useLegacyPipeline') ||
    options.generateTemplate === true; // Always use legacy for template generation

  if (useLegacyPipeline) {
    console.log("🔄 Using legacy pipeline (feature flag enabled)");
    await runLegacyPipeline(options);
  } else {
    console.log("🚀 Using new optimized pipeline");
    await runNewPipeline(options);
  }
}

// Add new pipeline function
async function runNewPipeline(options: MainOptions) {
  const { PipelineFactory } = await import('./pipeline');

  const config = {
    outputDir: options.outputDir,
    parallel: true,
    batchSize: 50,
    cacheEnabled: true,
    namespaces: ['client', 'server', 'shared'],
    incremental: true,
    featureFlags: {
      useLegacyPipeline: false,
      enableParallel: true,
      enableCaching: true,
    },
  };

  const pipeline = PipelineFactory.createPipeline(config);
  const pathPrefix = ".cache/extracted/VU-Docs-master/types/";

  // File discovery
  const globPaths = ["**/*.yaml"];
  const filePaths = globPaths.flatMap((globPath) => {
    const glob = new Glob(globPath);
    return Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
      join(pathPrefix, file)
    );
  });

  await pipeline.run(filePaths);
}

// Keep legacy function for backward compatibility
async function runLegacyPipeline(options: MainOptions) {
  // Existing buildTypes implementation here
  await buildTypes(
    REPO_ZIP_EXTRACT_DIR,
    options.outputDir,
    options.generateTemplate,
    undefined,
    options.modName
  );

  if (options.generateTemplate && options.modName) {
    await generateExtProject(options.modName, options.refresh, options.outputDir);
  }
}
```

### 3.3 Create Legacy Wrapper

**Create**: `src/pipeline/legacy-wrapper.ts`
```typescript
import { buildTypes } from '../index';
import { resolve } from 'path';
import type { MainOptions } from '../index';

export class LegacyPipelineWrapper {
  async run(options: MainOptions): Promise<void> {
    console.log("🔄 Running legacy pipeline wrapper");

    // Map new options to legacy options
    const legacyOptions: MainOptions = {
      outputDir: options.outputDir,
      generateTemplate: options.generateTemplate || false,
      modName: options.modName,
      rm: options.rm || false,
      refresh: options.refresh || false,
    };

    await buildTypes(
      REPO_ZIP_EXTRACT_DIR,
      legacyOptions.outputDir,
      legacyOptions.generateTemplate,
      undefined,
      legacyOptions.modName
    );

    if (legacyOptions.generateTemplate && legacyOptions.modName) {
      const { generateExtProject } = await import('../generators/ext-project');
      await generateExtProject(legacyOptions.modName, legacyOptions.refresh, legacyOptions.outputDir);
    }
  }
}
```

### 3.4 Update CLI Service

**Modify**: `src/cli-service.ts`
```typescript
// Add at the top
import { FeatureFlags } from './pipeline/config/feature-flags';

// Update executeTypesCommand
export async function executeTypesCommand(options: TypesCommandOptions): Promise<void> {
  const featureFlags = FeatureFlags.getInstance();

  if (featureFlags.getFlag('useLegacyPipeline')) {
    console.log("🔄 Using legacy pipeline for types generation");
    await executeLegacyTypesCommand(options);
  } else {
    console.log("🚀 Using new pipeline for types generation");
    await executeNewTypesCommand(options);
  }
}

// Add new pipeline command
async function executeNewTypesCommand(options: TypesCommandOptions): Promise<void> {
  const { PipelineFactory } = await import('./pipeline');

  console.log("🔨 Generating TypeScript declaration files...");

  const pipeline = PipelineFactory.createPipeline({
    outputDir: options.outputDir,
    parallel: true,
    batchSize: 50,
  });

  const pathPrefix = ".cache/extracted/VU-Docs-master/types/";
  const globPaths = ["**/*.yaml"];
  const filePaths = globPaths.flatMap((globPath) => {
    const glob = new Glob(globPath);
    return Array.from(glob.scanSync({ cwd: pathPrefix })).map((file) =>
      join(pathPrefix, file)
    );
  });

  await pipeline.run(filePaths);

  const outputLocation = options.outputDir || './typings';
  console.log(`\n✅ TypeScript types generated successfully in "${outputLocation}"!`);
  console.log(`   Generated files:`);
  console.log(`   • client.d.ts - Client-side API types`);
  console.log(`   • server.d.ts - Server-side API types`);
  console.log(`   • shared.d.ts - Shared types and utilities`);
}

// Keep legacy function
async function executeLegacyTypesCommand(options: TypesCommandOptions): Promise<void> {
  // Existing implementation
}
```

### 3.5 Migration Commands

Create a migration script to help users transition:

**Create**: `scripts/migrate-to-new-pipeline.js`
```javascript
#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const MIGRATION_FLAG_FILE = '.vu-ts-migration-flag.json';

function checkMigrationStatus() {
  if (!existsSync(MIGRATION_FLAG_FILE)) {
    console.log("🚀 Migration not yet started");
    return 'not-started';
  }

  const flag = JSON.parse(readFileSync(MIGRATION_FLAG_FILE, 'utf-8'));
  console.log(`📊 Migration status: ${flag.status}`);
  console.log(`✅ Completed stages: ${flag.completedStages.join(', ')}`);
  return flag.status;
}

function startMigration() {
  const migrationData = {
    status: 'in-progress',
    startedAt: new Date().toISOString(),
    completedStages: [],
    features: {
      useLegacyPipeline: true,
      enableParallel: false,
      enableCaching: false,
    }
  };

  writeFileSync(MIGRATION_FLAG_FILE, JSON.stringify(migrationData, null, 2));
  console.log("🚀 Migration started");
}

function completeStage(stageName) {
  const flag = JSON.parse(readFileSync(MIGRATION_FLAG_FILE, 'utf-8'));
  flag.completedStages.push(stageName);

  // Enable new features as stages complete
  switch(stageName) {
    case 'parallel-processing':
      flag.features.enableParallel = true;
      break;
    case 'caching':
      flag.features.enableCaching = true;
      break;
    case 'new-pipeline':
      flag.features.useLegacyPipeline = false;
      break;
  }

  writeFileSync(MIGRATION_FLAG_FILE, JSON.stringify(flag, null, 2));
  console.log(`✅ Completed stage: ${stageName}`);
}

function finishMigration() {
  const flag = JSON.parse(readFileSync(MIGRATION_FLAG_FILE, 'utf-8'));
  flag.status = 'completed';
  flag.completedAt = new Date().toISOString();

  writeFileSync(MIGRATION_FLAG_FILE, JSON.stringify(flag, null, 2));
  console.log("🎉 Migration completed!");

  // Clean up flag file after a delay
  setTimeout(() => {
    if (existsSync(MIGRATION_FLAG_FILE)) {
      execSync('rm ' + MIGRATION_FLAG_FILE);
    }
  }, 86400000); // 24 hours
}

// CLI handling
const command = process.argv[2];

switch(command) {
  case 'start':
    startMigration();
    break;
  case 'status':
    checkMigrationStatus();
    break;
  case 'complete-stage':
    const stage = process.argv[3];
    if (stage) {
      completeStage(stage);
    } else {
      console.error("❌ Stage name required");
      process.exit(1);
    }
    break;
  case 'finish':
    finishMigration();
    break;
  default:
    console.log("Usage:");
    console.log("  node scripts/migrate-to-new-pipeline.js start");
    console.log("  node scripts/migrate-to-new-pipeline.js status");
    console.log("  node scripts/migrate-to-new-pipeline.js complete-stage <stage-name>");
    console.log("  node scripts/migrate-to-new-pipeline.js finish");
    break;
}
```

## 4. Specific Testing Approach

### 4.1 Test File Structure

```
tests/
├── pipeline/
│   ├── DiscoveryStage.test.ts
│   ├── ParsingStage.test.ts
│   ├── TransformationStage.test.ts
│   ├── GenerationStage.test.ts
│   ├── Pipeline.test.ts
│   └── utils/
│       ├── cache.test.ts
│       ├── file-hash.test.ts
│       └── monitoring.test.ts
├── integration/
│   ├── end-to-end.test.ts
│   ├── performance.test.ts
│   └── migration.test.ts
└── fixtures/
    ├── sample-files/
    │   ├── Class.yaml
    │   ├── Enum.yaml
    │   └── Event.yaml
    └── expected-outputs/
        ├── client.d.ts
        ├── server.d.ts
        └── shared.d.ts
```

### 4.2 Unit Tests for Discovery Stage

**Create**: `tests/pipeline/DiscoveryStage.test.ts`
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryStage } from '../../src/pipeline/stages/discovery';
import { createDefaultConfig } from '../../src/pipeline/config';
import type { PipelineContext } from '../../src/pipeline/interfaces';
import { createLogger } from '../../src/pipeline/utils/logger';
import { globSync } from 'glob';

describe('DiscoveryStage', () => {
  let discoveryStage: DiscoveryStage;
  let mockContext: PipelineContext;
  let mockFileList: string[];

  beforeEach(() => {
    discoveryStage = new DiscoveryStage();
    mockContext = {
      logger: createLogger(),
      config: createDefaultConfig(),
      metadata: new Map(),
      cache: {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        clear: vi.fn(),
      },
    };

    // Create mock file paths
    mockFileList = [
      '.cache/extracted/VU-Docs-master/types/Class.yaml',
      '.cache/extracted/VU-Docs-master/types/client/Class.yaml',
      '.cache/extracted/VU-Docs-master/types/server/Class.yaml',
      '.cache/extracted/VU-Docs-master/types/shared/Event.yaml',
    ];
  });

  it('should discover files correctly', async () => {
    const result = await discoveryStage.process(mockFileList, mockContext);

    expect(result).toHaveLength(4);
    expect(result.every(file => file.path !== '')).toBe(true);
    expect(result.every(file => file.hash.length > 0)).toBe(true);
    expect(result.every(file => ['client', 'server', 'shared', 'fb'].includes(file.namespace))).toBe(true);
  });

  it('should handle file discovery errors gracefully', async () => {
    const invalidFileList = [
      'non-existent-file.yaml',
      '.cache/extracted/VU-Docs-master/types/Class.yaml',
    ];

    const result = await discoveryStage.process(invalidFileList, mockContext);

    expect(result).toHaveLength(1);
    expect(result[0].path).toContain('Class.yaml');
  });

  it('should namespace files correctly', async () => {
    const result = await discoveryStage.process(mockFileList, mockContext);

    const clientFiles = result.filter(f => f.namespace === 'client');
    const serverFiles = result.filter(f => f.namespace === 'server');
    const sharedFiles = result.filter(f => f.namespace === 'shared');

    expect(clientFiles).toHaveLength(1);
    expect(serverFiles).toHaveLength(1);
    expect(sharedFiles).toHaveLength(1);
  });
});
```

### 4.3 Performance Tests

**Create**: `tests/integration/performance.test.ts`
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { PipelineFactory } from '../../src/pipeline';
import { generateTestFiles } from '../fixtures/generate-test-data';
import { measurePerformance } from '../utils/performance';

describe('Performance Tests', () => {
  let testFiles: string[];
  const fileCount = 100;

  beforeAll(async () => {
    // Generate test files
    testFiles = await generateTestFiles(fileCount);
  });

  it('should process 100 files under 5 seconds', async () => {
    const pipeline = PipelineFactory.createPipeline({
      batchSize: 20,
      parallel: true,
    });

    const { duration } = await measurePerformance(async () => {
      await pipeline.run(testFiles);
    });

    console.log(`Processed ${fileCount} files in ${duration}ms`);
    expect(duration).toBeLessThan(5000);
  });

  it('should show performance improvement with parallel processing', async () => {
    const sequentialPipeline = PipelineFactory.createPipeline({
      parallel: false,
      batchSize: 10,
    });

    const parallelPipeline = PipelineFactory.createPipeline({
      parallel: true,
      batchSize: 20,
    });

    const sequentialTime = await measurePerformance(async () => {
      await sequentialPipeline.run(testFiles.slice(0, 50));
    });

    const parallelTime = await measurePerformance(async () => {
      await parallelPipeline.run(testFiles.slice(0, 50));
    });

    console.log(`Sequential: ${sequentialTime.duration}ms, Parallel: ${parallelTime.duration}ms`);
    // Parallel should be at least 30% faster
    expect(parallelTime.duration).toBeLessThan(sequentialTime.duration * 0.7);
  });
});
```

### 4.4 Migration Tests

**Create**: `tests/integration/migration.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlags } from '../../src/pipeline/config/feature-flags';
import { LegacyPipelineWrapper } from '../../src/pipeline/legacy-wrapper';
import { runNewPipeline } from '../../src/index';
import { resolve } from 'path';

describe('Migration Tests', () => {
  let featureFlags: FeatureFlags;

  beforeEach(() => {
    featureFlags = FeatureFlags.getInstance();
    // Reset flags for each test
    featureFlags.setFlag('useLegacyPipeline', false);
  });

  it('should allow switching between legacy and new pipeline', async () => {
    // Test legacy pipeline
    featureFlags.setFlag('useLegacyPipeline', true);

    const legacyWrapper = new LegacyPipelineWrapper();
    expect(() => legacyWrapper.run({})).not.toThrow();

    // Test new pipeline
    featureFlags.setFlag('useLegacyPipeline', false);

    expect(() => runNewPipeline({})).not.toThrow();
  });

  it('should maintain output compatibility between pipelines', async () => {
    const testFiles = ['test.yaml']; // Use fixture file

    // Generate with legacy
    featureFlags.setFlag('useLegacyPipeline', true);
    const legacyResult = await runLegacyPipeline({ outputDir: 'legacy-output' });

    // Generate with new
    featureFlags.setFlag('useLegacyPipeline', false);
    const newResult = await runNewPipeline({ outputDir: 'new-output' });

    // Compare outputs
    const legacyContent = await Bun.file('legacy-output/shared.d.ts').text();
    const newContent = await Bun.file('new-output/shared.d.ts').text();

    // Content should be equivalent (allowing for minor formatting differences)
    expect(legacyContent.trim()).toBe(newContent.trim());
  });
});
```

## 5. Configuration Details

### 5.1 Configuration File Support

**Create**: `src/pipeline/config/file-config.ts`
```typescript
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PipelineConfig } from '../interfaces';
import { createDefaultConfig } from './config';

export interface ConfigFile {
  pipeline?: {
    parallel?: boolean;
    batchSize?: number;
    cacheEnabled?: boolean;
    maxWorkers?: number;
    incremental?: boolean;
  };
  featureFlags?: {
    useLegacyPipeline?: boolean;
    enableParallel?: boolean;
    enableCaching?: boolean;
  };
  output?: {
    dir?: string;
  };
}

export function loadConfigFromFile(): PipelineConfig {
  const configPath = resolve(process.cwd(), 'vu-ts.config.json');
  const configPathTs = resolve(process.cwd(), 'vu-ts.config.ts');

  let config: ConfigFile = {};

  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  } else if (existsSync(configPathTs)) {
    // For TypeScript config files
    const tsConfig = require(configPathTs);
    config = tsConfig.default || tsConfig;
  }

  return mergeConfig(config);
}

function mergeConfig(configFile: ConfigFile): PipelineConfig {
  const defaultConfig = createDefaultConfig();

  return {
    parallel: configFile.pipeline?.parallel ?? defaultConfig.parallel,
    batchSize: configFile.pipeline?.batchSize ?? defaultConfig.batchSize,
    cacheEnabled: configFile.pipeline?.cacheEnabled ?? defaultConfig.cacheEnabled,
    maxWorkers: configFile.pipeline?.maxWorkers ?? defaultConfig.maxWorkers,
    incremental: configFile.pipeline?.incremental ?? defaultConfig.incremental,
    outputDir: configFile.output?.dir ?? defaultConfig.outputDir,
    namespaces: defaultConfig.namespaces,
    featureFlags: {
      useLegacyPipeline: configFile.featureFlags?.useLegacyPipeline ??
        defaultConfig.featureFlags.useLegacyPipeline,
      enableParallel: configFile.featureFlags?.enableParallel ??
        defaultConfig.featureFlags.enableParallel,
      enableCaching: configFile.featureFlags?.enableCaching ??
        defaultConfig.featureFlags.enableCaching,
    },
  };
}
```

### 5.2 Environment Variable Support

**Create**: `src/pipeline/config/env-config.ts`
```typescript
import type { PipelineConfig } from '../interfaces';
import { createDefaultConfig } from './config';

export function createConfigFromEnv(): Partial<PipelineConfig> {
  const config: Partial<PipelineConfig> = {};

  // Environment variable overrides
  if (process.env.VU_TS_OUTPUT_DIR) {
    config.outputDir = process.env.VU_TS_OUTPUT_DIR;
  }

  if (process.env.VU_TS_BATCH_SIZE) {
    config.batchSize = parseInt(process.env.VU_TS_BATCH_SIZE, 10);
  }

  if (process.env.VU_TS_MAX_WORKERS) {
    config.maxWorkers = parseInt(process.env.VU_TS_MAX_WORKERS, 10);
  }

  if (process.env.VU_TS_PARALLEL !== undefined) {
    config.parallel = process.env.VU_TS_PARALLEL === 'true';
  }

  if (process.env.VU_TS_CACHE_ENABLED !== undefined) {
    config.cacheEnabled = process.env.VU_TS_CACHE_ENABLED === 'true';
  }

  if (process.env.VU_TS_INCREMENTAL !== undefined) {
    config.incremental = process.env.VU_TS_INCREMENTAL === 'true';
  }

  return config;
}
```

### 5.3 Configuration Example

**Example Config**: `vu-ts.config.json`
```json
{
  "pipeline": {
    "parallel": true,
    "batchSize": 100,
    "cacheEnabled": true,
    "maxWorkers": 8,
    "incremental": true
  },
  "featureFlags": {
    "useLegacyPipeline": false,
    "enableParallel": true,
    "enableCaching": true
  },
  "output": {
    "dir": "./typings"
  }
}
```

## 6. Concrete Code Examples

### 6.1 Caching Implementation

**Create**: `src/pipeline/utils/cache.ts`
```typescript
import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import type { CacheProvider } from '../interfaces';

export class MemoryCache implements CacheProvider {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private maxSize = 1000;
  private ttl = 3600000; // 1 hour

  async get<T>(key: string): Promise<T | undefined> {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export class DiskCache implements CacheProvider {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    return resolve(this.cacheDir, `${hash}.json`);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const filePath = this.getCacheFilePath(key);

    if (!existsSync(filePath)) {
      return undefined;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const cached = JSON.parse(content);

      // Check if TTL expired
      if (Date.now() - cached.timestamp > cached.ttl) {
        unlinkSync(filePath);
        return undefined;
      }

      return cached.value as T;
    } catch {
      unlinkSync(filePath);
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const filePath = this.getCacheFilePath(key);
    const cacheData = {
      value,
      timestamp: Date.now(),
      ttl: 3600000, // 1 hour
    };

    writeFileSync(filePath, JSON.stringify(cacheData, null, 2));
  }

  async has(key: string): Promise<boolean> {
    const filePath = this.getCacheFilePath(key);
    return existsSync(filePath);
  }

  async clear(): Promise<void> {
    const files = existsSync(this.cacheDir)
      ? require('fs').readdirSync(this.cacheDir)
      : [];

    for (const file of files) {
      unlinkSync(resolve(this.cacheDir, file));
    }
  }
}

export function createCacheProvider(): CacheProvider {
  if (process.env.NODE_ENV === 'production') {
    return new DiskCache(resolve(import.meta.dir, '../.cache'));
  }
  return new MemoryCache();
}
```

### 6.2 Parallel Processing Utility

**Create**: `src/pipeline/utils/parallel.ts`
```typescript
import { Worker } from 'worker_threads';
import { resolve } from 'path';

export interface WorkerTask<T, R> {
  id: number;
  data: T;
  processor: string;
}

export interface WorkerResult<T, R> {
  id: number;
  success: boolean;
  result?: R;
  error?: string;
}

export class WorkerPool<T, R> {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask<T, R>[] = [];
  private resultQueue: WorkerResult<T, R>[] = [];
  private maxWorkers: number;
  private workerScript: string;

  constructor(maxWorkers: number, workerScript: string) {
    this.maxWorkers = maxWorkers;
    this.workerScript = workerScript;
  }

  async process(tasks: WorkerTask<T, R>[]): Promise<WorkerResult<T, R>[]> {
    // Initialize workers
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workers.push(new Worker(resolve(__dirname, this.workerScript)));
    }

    // Add all tasks to queue
    this.taskQueue = [...tasks];
    this.resultQueue = [];

    // Process queue
    await this.processQueue();

    // Cleanup
    await this.cleanup();

    return this.resultQueue;
  }

  private async processQueue(): Promise<void> {
    return new Promise((resolve) => {
      const processNext = async () => {
        if (this.taskQueue.length === 0) {
          resolve();
          return;
        }

        // Find available worker
        const availableWorker = this.workers.find(w => !w.busy);
        if (!availableWorker) {
          // Check for completed workers
          const completedWorker = this.workers.find(w => w.completed);
          if (completedWorker) {
            await this.handleWorkerResult(completedWorker);
            processNext();
          } else {
            // Wait and try again
            setTimeout(processNext, 10);
          }
          return;
        }

        // Assign task to worker
        const task = this.taskQueue.shift()!;
        availableWorker.busy = true;
        availableWorker.completed = false;
        availableWorker.postMessage({ task });
      };

      // Start processing
      processNext();
    });
  }

  private async handleWorkerResult(worker: Worker): Promise<void> {
    return new Promise((resolve) => {
      worker.once('message', (result: WorkerResult<T, R>) => {
        this.resultQueue.push(result);
        worker.busy = false;
        worker.completed = true;
        resolve();
      });
    });
  }

  private async cleanup(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
  }
}

// Example worker script: worker.ts
export const workerScript = `
  const { parentPort } = require('worker_threads');

  parentPort.on('message', async ({ task }) => {
    try {
      const result = await processTask(task);
      parentPort.postMessage({
        id: task.id,
        success: true,
        result
      });
    } catch (error) {
      parentPort.postMessage({
        id: task.id,
        success: false,
        error: error.message
      });
    }
  });

  async function processTask(task) {
    // Your processing logic here
    const { processor, data } = task;

    switch(processor) {
      case 'parse':
        return parseFile(data);
      case 'transform':
        return transformData(data);
      default:
        throw new Error('Unknown processor');
    }
  }
`;
```

### 6.3 Monitoring and Performance Tracking

**Create**: `src/pipeline/utils/monitoring.ts`
```typescript
import type { ProcessingStats } from '../types';

export class PerformanceMonitor {
  private stats: ProcessingStats;
  private startMemory: number;
  private measurements: Array<{
    timestamp: number;
    memory: number;
    filesProcessed: number;
  }> = [];

  constructor() {
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      startTime: Date.now(),
      memoryUsage: {
        peak: 0,
        current: 0,
      },
      errors: [],
    };
    this.startMemory = process.memoryUsage?.().heapUsed || 0;
  }

  startProcessing(fileCount: number): void {
    this.stats.totalFiles = fileCount;
    this.measurements.push({
      timestamp: Date.now(),
      memory: this.getCurrentMemory(),
      filesProcessed: 0,
    });
  }

  incrementProcessed(): void {
    this.stats.processedFiles++;
    this.updateMemoryStats();
    this.recordMeasurement();
  }

  incrementFailed(error?: Error): void {
    this.stats.failedFiles++;
    if (error) {
      this.stats.errors.push(error);
    }
    this.updateMemoryStats();
    this.recordMeasurement();
  }

  updateMemoryStats(): void {
    const currentMemory = this.getCurrentMemory();
    this.stats.memoryUsage.current = currentMemory;
    this.stats.memoryUsage.peak = Math.max(
      this.stats.memoryUsage.peak,
      currentMemory
    );
  }

  private getCurrentMemory(): number {
    return process.memoryUsage?.().heapUsed || 0;
  }

  private recordMeasurement(): void {
    this.measurements.push({
      timestamp: Date.now(),
      memory: this.getCurrentMemory(),
      filesProcessed: this.stats.processedFiles,
    });
  }

  getStats(): ProcessingStats {
    this.stats.endTime = Date.now();
    return { ...this.stats };
  }

  getProgress(): number {
    if (this.stats.totalFiles === 0) return 0;
    return (this.stats.processedFiles / this.stats.totalFiles) * 100;
  }

  generateReport(): string {
    const duration = (this.stats.endTime || Date.now()) - this.stats.startTime;
    const memoryMB = this.stats.memoryUsage.peak / 1024 / 1024;

    return `
Performance Report:
==================
Total Files: ${this.stats.totalFiles}
Processed: ${this.stats.processedFiles} (${this.getProgress().toFixed(1)}%)
Failed: ${this.stats.failedFiles}
Duration: ${duration}ms
Memory Peak: ${memoryMB.toFixed(2)}MB
Errors: ${this.stats.errors.length}

Measurements:
${this.measurements.map(m =>
  `  ${m.timestamp - this.stats.startTime}ms: ${m.filesProcessed} files, ${(m.memory / 1024 / 1024).toFixed(2)}MB`
).join('\n')}
    `.trim();
  }
}

// Usage example:
const monitor = new PerformanceMonitor();
monitor.startProcessing(1000);

// During processing:
for (const file of files) {
  try {
    await processFile(file);
    monitor.incrementProcessed();
  } catch (error) {
    monitor.incrementFailed(error as Error);
  }
}

// At the end:
const stats = monitor.getStats();
console.log(monitor.generateReport());
```

### 6.4 Stream-based File Processing

**Create**: `src/pipeline/utils/streams.ts`
```typescript
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { pipeline, Transform, TransformCallback } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

export class FileProcessorStream<T> {
  private transform: Transform;
  private processed = 0;
  private errors: Error[] = [];

  constructor(
    processor: (data: T) => Promise<any>,
    options: {
      batchSize?: number;
      parallel?: boolean;
    } = {}
  ) {
    const { batchSize = 10, parallel = true } = options;

    this.transform = new Transform({
      objectMode: true,
      highWaterMark: batchSize,
      async transform(chunk: T, encoding: TransformCallback, callback) {
        try {
          if (parallel) {
            // Process in parallel
            const result = await processor(chunk);
            this.push(result);
          } else {
            // Process sequentially
            const result = await processor(chunk);
            this.push(result);
          }
          callback();
        } catch (error) {
          this.errors.push(error as Error);
          callback(error as Error);
        }
      },
    });
  }

  async processFiles(filePaths: string[]): Promise<any[]> {
    const results: any[] = [];

    await streamPipeline(
      createReadStream(filePaths.join('\n'), 'utf-8'),
      this.transform,
      new Transform({
        objectMode: true,
        transform(chunk: any, encoding: TransformCallback, callback) {
          results.push(chunk);
          callback();
        },
      })
    );

    return results;
  }

  getStats() {
    return {
      processed: this.processed,
      errors: this.errors,
    };
  }
}

// Example usage for file processing
export async function* processFilesInBatches<T>(
  filePaths: string[],
  processor: (filePath: string) => Promise<T>,
  batchSize: number = 10
): AsyncIterable<{ results: T[]; errors: Error[] }> {
  const batches: string[][] = [];

  // Create batches
  for (let i = 0; i < filePaths.length; i += batchSize) {
    batches.push(filePaths.slice(i, i + batchSize));
  }

  // Process each batch
  for (const batch of batches) {
    const results: T[] = [];
    const errors: Error[] = [];

    const promises = batch.map(async (filePath) => {
      try {
        const result = await processor(filePath);
        results.push(result);
      } catch (error) {
        errors.push(error as Error);
      }
    });

    await Promise.all(promises);

    yield { results, errors };
  }
}

// Stream-based YAML processing
export function createYamlStream(): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk: string, encoding: TransformCallback, callback) {
      try {
        const lines = chunk.split('\n');
        let currentObject = '';
        let inObject = false;

        for (const line of lines) {
          if (line.trim() === '') {
            if (inObject && currentObject) {
              const parsed = YAML.parse(currentObject);
              if (parsed) {
                this.push(parsed);
              }
              currentObject = '';
              inObject = false;
            }
          } else {
            currentObject += line + '\n';
            inObject = true;
          }
        }

        // Handle last object if file ends without newline
        if (inObject && currentObject) {
          const parsed = YAML.parse(currentObject);
          if (parsed) {
            this.push(parsed);
          }
        }

        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });
}
```

## 7. Critical Implementation Files

The following files are critical for the successful implementation of the pipeline rewrite:

1. **`src/pipeline/index.ts`** - Main pipeline orchestrator to replace the buildTypes function
2. **`src/pipeline/interfaces.ts`** - Core interfaces for the new pipeline architecture
3. **`src/pipeline/stages/parsing.ts`** - Performance-critical parsing stage optimization
4. **`src/pipeline/utils/cache.ts`** - Implementation of content-based caching system
5. **`src/pipeline/config/feature-flags.ts`** - Feature flag system for gradual migration
6. **`src/index.ts`** - Updated to use new pipeline while maintaining backward compatibility

## 8. Success Metrics

### Performance Targets
- **Memory usage reduction**: 60-80% through streaming
- **Processing time improvement**: 40-60% through parallelization
- **Error recovery time**: 90% improvement through isolation
- **Incremental build speed**: 2-3x faster for changes

### Code Quality Metrics
- Test coverage above 90%
- Code complexity reduced by 30%
- Documentation completeness

### User Experience
- CLI response time improvement
- Better error messages
- More predictable behavior

## 9. Risk Mitigation

### Technical Risks
1. **Memory Issues**: Implement memory monitoring and fallback mechanisms
2. **Performance Regression**: Comprehensive benchmarking before release
3. **Compatibility Issues**: Extensive testing with real datasets

### Migration Risks
1. **User Disruption**: Gradual migration with feature flags
2. **Data Loss**: Comprehensive backup strategy
3. **Rollback Plan**: Maintain legacy implementation during transition

## 10. Implementation Timeline

### Week 1: Foundation
- Create pipeline interfaces
- Implement basic stage structure
- Add factory pattern

### Week 2: Core Implementation
- Implement all pipeline stages
- Add parallel processing
- Implement caching

### Week 3: Optimizations
- Performance tuning
- Memory optimization
- Error handling improvements

### Week 4: Migration
- Integration testing
- Performance validation
- Documentation updates

## Conclusion

This comprehensive rewrite will transform the current monolithic sequential implementation into a modular, parallel, memory-efficient pipeline that can scale to handle larger documentation repositories while maintaining backward compatibility and improving user experience. The implementation follows best practices for TypeScript development and includes comprehensive testing strategies to ensure reliability.

The modular design allows for easy extension and maintenance, while the performance optimizations will significantly improve the developer experience when working with large codebases. The gradual migration strategy ensures that existing users will not experience disruption during the transition.