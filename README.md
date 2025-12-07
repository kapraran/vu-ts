# VU TypeScript Generator

A TypeScript declaration file generator for VU-Docs. This tool downloads the VU-Docs repository, parses YAML documentation files, and generates TypeScript declaration files (`.d.ts`) organized by namespace.

## Requirements

- [Bun](https://bun.sh) (latest version)

## Installation

```bash
bun install
```

## Setup

Before generating TypeScript declarations, you need to infer the schema from YAML files:

```bash
bun run infer-schema
```

This will:
- Scan all YAML files in the VU-Docs repository
- Infer TypeScript interfaces for each type (class, enum, event, hook, library)
- Generate type definitions to `src/types/generated/`
- Generate JSON schemas for validation to `schemas/`

**Note:** Run this script whenever the VU-Docs repository is updated to ensure all fields are captured.

## Usage

### Generate TypeScript declarations

```bash
bun start
```

This will:
1. Download the VU-Docs repository from GitHub
2. Extract the ZIP file
3. Parse all YAML files
4. Generate TypeScript declaration files in the `typings/` directory

### Development mode (with watch)

```bash
bun dev
```

### Validate YAML files

```bash
bun validate <type> [--file <glob>] [--ftype <type>]
```

Example:
```bash
bun validate RawClassFile --file "client/**/*.yaml"
```

### Inspect YAML data

```bash
bun inspect.js <jsonpath> [--file <glob>] [--type] [--ftype <type>]
```

## Project Structure

- `src/` - Source TypeScript files
  - `parsers/` - YAML file parsers
  - `generators/` - TypeScript declaration generators
  - `transformers/` - Data transformers
- `typings/` - Generated TypeScript declaration files
- `.cache/` - Cached downloaded and extracted files

## Dependencies

This project uses Bun's native APIs for:
- File system operations (`Bun.file()`, `Bun.write()`)
- HTTP requests (`fetch()`)
- Glob pattern matching (`Bun.glob()`)
- Command-line argument parsing (`parseArgs` from `node:util`)

External dependencies:
- `yaml` - YAML parsing
- `adm-zip` - ZIP archive extraction
- `ajv` - JSON schema validation
- `prettier` - Code formatting (optional)
- `typescript-json-schema` - TypeScript to JSON schema conversion
- `jsonpath-plus` - JSONPath queries
