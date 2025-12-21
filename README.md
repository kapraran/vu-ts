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

### Managing Custom Events

You can define custom events for your mod that will be typed in TypeScript. Custom events are stored in `custom-events.json` at your mod root and their type declarations are automatically injected into `ext-ts/{context}/types.d.ts`.

#### Add a custom event

```bash
# Add a server event with parameters
vu-ts event add --context server --name "MyMod:PlayerJoined" --param player:Player --param joinTime:number

# Add a client event
vu-ts event add --context client --name "MyMod:UIUpdate" --param data:string

# Add a shared event
vu-ts event add --context shared --name "MyMod:GlobalEvent" --param value:number

# Specify mod root directory
vu-ts event add --context server --name "MyMod:Event" --mod-root ./my-mod
```

#### Remove a custom event

```bash
vu-ts event remove --context server --name "MyMod:PlayerJoined"
```

#### List all custom events

```bash
# List all events
vu-ts event list

# List events for a specific context
vu-ts event list --context server

# List events from a specific mod
vu-ts event list --mod-root ./my-mod
```

**Parameter format:**
- Basic: `--param name:Type` (e.g., `--param player:Player`)
- Nullable: `--param data:DataContainer|null` or `--param data:DataContainer | null`
- Table: Use `LuaTable<string, Type>` as the type

**Generated declarations:**
- `Subscribe(eventName, callback)` - Subscribe to the event
- `Dispatch(eventName, ...args)` - Dispatch the event
- `DispatchLocal(eventName, ...args)` - Dispatch locally (only your mod receives it)

### Managing Custom NetEvents

NetEvents allow communication between client and server. When you define a NetEvent in one context, the appropriate Subscribe/Unsubscribe methods are automatically generated in the opposite context.

#### Add a custom NetEvent

```bash
# Add a server NetEvent (server sends to clients)
vu-ts netevent add --context server --name "MyMod:ServerMessage" --param message:string

# Add a client NetEvent (client sends to server)
vu-ts netevent add --context client --name "MyMod:ClientAction" --param action:string --param data:number

# Specify mod root directory
vu-ts netevent add --context server --name "MyMod:NetEvent" --mod-root ./my-mod
```

#### Remove a custom NetEvent

```bash
vu-ts netevent remove --context server --name "MyMod:ServerMessage"
```

#### List all custom NetEvents

```bash
# List all NetEvents
vu-ts netevent list

# List NetEvents for a specific context
vu-ts netevent list --context client

# List NetEvents from a specific mod
vu-ts netevent list --mod-root ./my-mod
```

**How NetEvents work:**
- **Server NetEvents** (defined with `--context server`):
  - Server gets: `Broadcast*`, `SendTo*` methods (sending methods)
  - Client gets: `Subscribe`, `Unsubscribe` methods (receiving methods)
  
- **Client NetEvents** (defined with `--context client`):
  - Client gets: `Send*` methods (sending methods)
  - Server gets: `Subscribe`, `Unsubscribe` methods (receiving methods, with `player: Player` as first parameter)

**Generated declarations:**
- Server NetEvents on server: `Broadcast`, `BroadcastLocal`, `BroadcastUnreliable`, `BroadcastUnreliableLocal`, `BroadcastUnreliableOrdered`, `BroadcastUnreliableOrderedLocal`, `SendTo`, `SendToLocal`, `SendUnreliableTo`, `SendUnreliableToLocal`, `SendUnreliableOrderedTo`, `SendUnreliableOrderedToLocal`
- Client NetEvents on client: `Send`, `SendLocal`, `SendUnreliable`, `SendUnreliableLocal`, `SendUnreliableOrdered`, `SendUnreliableOrderedLocal`
- Subscribe/Unsubscribe: Generated in the receiving context with proper type signatures

**Note:** NetEvents can only be defined for `client` or `server` contexts, not `shared`.

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
