> **⚠️ WIP - Work In Progress**
>
> **This project is currently under active development and is not recommended for production use at this time.**
>
> Features may be incomplete, APIs may change, and there may be breaking changes in future releases. Use at your own risk.

# VU TypeScript Mod Generator

A streamlined tool for creating Venice Unleashed mods with full TypeScript type safety. Generates TypeScript declarations from VU-Docs and provides a ready-to-use project template.

## Quick Start

### 1. Create a New Mod

```bash
# Using bunx (no installation)
bunx @kapraran/vu-ts init my-awesome-mod

# Or install globally
bun install -g @kapraran/vu-ts
vu-ts init my-awesome-mod
```

This creates a complete mod project with:

- TypeScript configuration
- VU-Docs type definitions
- Helper scripts and build tools
- Organized folder structure (`ext-ts/client`, `ext-ts/server`, `ext-ts/shared`)

### 2. Install Dependencies

```bash
cd my-awesome-mod
bun install
```

### 3. Start Developing

Write your mod code in:

- `ext-ts/client/` - Client-side code (runs in the game)
- `ext-ts/server/` - Server-side code (runs on the server)
- `ext-ts/shared/` - Shared code (used by both client and server)

### 4. Build Your Mod

```bash
# Build all folders
bun run build

# Watch mode (auto-rebuild on changes)
bun run watch
```

### 5. Keep Your Mod Updated

When VU-Docs updates or we release new helper scripts:

```bash
# Check for updates
vu-ts status

# Update to latest
vu-ts update

# Force update (even if already up to date)
vu-ts update --force
```

That's it! Your mod is ready to use with full TypeScript support.

## Project Structure

After running `vu-ts init`, your project will look like:

```
my-mod/
├── .vu-ts/                    # Managed by vu-ts (safe to overwrite)
│   ├── typings/              # VU-Docs TypeScript declarations
│   │   ├── client.d.ts       # Client-side API types
│   │   ├── server.d.ts       # Server-side API types
│   │   └── shared.d.ts       # Shared types
│   ├── config/               # Build configuration
│   └── scripts/              # Helper scripts
├── ext-ts/                   # Your mod code (never touched by vu-ts)
│   ├── client/               # Client-side code
│   │   ├── tsconfig.json
│   │   ├── types.d.ts
│   │   └── __init__.ts       # Your code here
│   ├── server/               # Server-side code
│   │   ├── tsconfig.json
│   │   ├── types.d.ts
│   │   └── __init__.ts       # Your code here
│   └── shared/               # Shared code
│       ├── tsconfig.json
│       ├── types.d.ts
│       └── __init__.ts       # Your code here
├── ext/                      # Compiled Lua code (auto-generated)
├── mod.json                  # Mod configuration
├── package.json              # Dependencies
└── README.md                 # Your mod's README
```

## Type Safety

Each folder has its own TypeScript configuration that restricts which types are available:

- **Client** - Access to `shared.d.ts` and `client.d.ts` types only
- **Server** - Access to `shared.d.ts` and `server.d.ts` types only
- **Shared** - Access to `shared.d.ts` types only

This prevents you from accidentally using server-only APIs in client code and vice versa.

## Updating Your Mod

### Check Update Status

```bash
vu-ts status
```

Shows:

- Current VU-Docs commit
- Last update time
- Whether updates are available

### Apply Updates

```bash
vu-ts update
```

This will:

- Download latest VU-Docs if available
- Regenerate TypeScript declarations
- Update helper scripts and configuration
- Preserve all your code in `ext-ts/*`

**Note:** The `.vu-ts/` directory is 100% managed by vu-ts. Your code in `ext-ts/` is always preserved.

## Custom Events

Create typed custom events for your mod:

### Add a Custom Event

```bash
# Server event with parameters
vu-ts event add --context server --name "MyMod:PlayerJoined" --param player:Player --param joinTime:number

# Client event
vu-ts event add --context client --name "MyMod:UIUpdate" --param data:string

# Shared event
vu-ts event add --context shared --name "MyMod:GlobalEvent" --param value:number
```

### Use Custom Events

In your TypeScript code:

```typescript
// Subscribe to an event
Subscribe("MyMod:PlayerJoined", (player: Player, joinTime: number) => {
  print(`Player ${player.name} joined at ${joinTime}`);
});

// Dispatch an event
Dispatch("MyMod:PlayerJoined", somePlayer, DateTime.Now());
```

### Remove a Custom Event

```bash
vu-ts event remove --context server --name "MyMod:PlayerJoined"
```

### List Custom Events

```bash
# List all events
vu-ts event list

# List only server events
vu-ts event list --context server
```

**Parameter Types:**

- Basic: `--param name:Type` (e.g., `--param player:Player`)
- Nullable: `--param data:DataContainer|null`
- Tables: Use `LuaTable<string, Type>`

## Custom NetEvents

NetEvents enable communication between client and server:

### Add a NetEvent

```bash
# Server NetEvent (server sends to clients)
vu-ts netevent add --context server --name "MyMod:ServerMessage" --param message:string

# Client NetEvent (client sends to server)
vu-ts netevent add --context client --name "MyMod:ClientAction" --param action:string --param data:number
```

### How NetEvents Work

**Server NetEvents:**

- **Server side** gets: `Broadcast`, `SendTo`, etc. (sending methods)
- **Client side** gets: `Subscribe`, `Unsubscribe` (receiving methods)

**Client NetEvents:**

- **Client side** gets: `Send`, `SendLocal`, etc. (sending methods)
- **Server side** gets: `Subscribe`, `Unsubscribe` with `player: Player` parameter

### Use NetEvents

```typescript
// Server: Send to all clients
Broadcast("MyMod:ServerMessage", "Hello from server!");

// Server: Send to specific player
SendTo(somePlayer, "MyMod:ClientAction", "jump", 42);

// Client: Subscribe to server messages
Subscribe("MyMod:ServerMessage", (message: string) => {
  print(`Received: ${message}`);
});

// Client: Send to server
Send("MyMod:ClientAction", "move", 100);
```

### Remove/List NetEvents

```bash
# Remove
vu-ts netevent remove --context server --name "MyMod:ServerMessage"

# List
vu-ts netevent list
```

## Common Workflows

### Creating a Shared Utility

1.  Add code to `ext-ts/shared/myUtils.ts`:

```typescript
export function formatPlayerName(player: Player): string {
  return `[${player.teamId}] ${player.name}`;
}
```

2.  Import it in client or server:

```typescript
import { formatPlayerName } from "@shared/myUtils";

print(formatPlayerName(somePlayer));
```

### Building Your Mod

```bash
# One-time build
bun run build

# Watch mode (rebuilds automatically)
bun run watch

# Build specific folders
bun run build:client
bun run build:server
bun run build:shared
```

### Updating Types

```bash
# Check what's out of date
vu-ts status

# Update to latest VU-Docs
vu-ts update
```

## Requirements

- [Bun](https://bun.sh) (latest version)
- Venice Unleashed server/client

## Installation Options

### Using bunx (Recommended)

No installation needed - run directly:

```bash
bunx @kapraran/vu-ts init my-mod
```

### Global Installation

```bash
bun install -g @kapraran/vu-ts
# or
npm install -g @kapraran/vu-ts

vu-ts init my-mod
```

## Commands Reference

| Command                          | Description                         |
| -------------------------------- | ----------------------------------- |
| `vu-ts init <name>`              | Create a new mod project            |
| `vu-ts update`                   | Update types and helper files       |
| `vu-ts status`                   | Show update status and version info |
| `vu-ts event add/remove/list`    | Manage custom events                |
| `vu-ts netevent add/remove/list` | Manage custom netEvents             |
| `vu-ts version`                  | Show vu-ts version                  |

## Troubleshooting

### "Not a vu-ts project" Error

Make sure you're running commands from your mod's root directory (where `.vu-ts/metadata.json` exists).

### Build Errors

1.  Ensure dependencies are installed: `bun install`
2.  Check TypeScript errors: `bun run build:client` (or server/shared)
3.  Try regenerating types: `vu-ts update --force`

### Type Errors After VU Update

Run `vu-ts update` to get the latest type definitions from VU-Docs.

### Permission Errors

Make sure you have write permissions to your mod directory.

## Development

### Local Setup

If you want to contribute to vu-ts:

```bash
git clone https://github.com/kapraran/vu-ts.git
cd vu-ts
bun install
```

### Running Tests

```bash
# Build the tool
bun src/cli.ts --help

# Test with sample project
vu-ts init test-mod
cd test-mod
vu-ts status
vu-ts update
```

## License

MIT
