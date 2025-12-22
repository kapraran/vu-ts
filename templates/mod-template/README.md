# Mod Template

This template provides a structure for Venice Unleashed mods with TypeScript type safety.

## Folder Structure

- **`ext-ts/client/`** - Client-side code (runs in the game client)
  - Has access to: `shared.d.ts` and `client.d.ts` types
- **`ext-ts/server/`** - Server-side code (runs on the server)
  - Has access to: `shared.d.ts` and `server.d.ts` types
- **`ext-ts/shared/`** - Shared code (used by both client and server)
  - Has access to: `shared.d.ts` types only
- **`.vu-ts/typings/`** - TypeScript declaration files for Venice Unleashed API
- **`.vu-ts/config/`** - TypeScript and build configuration files
- **`.vu-ts/scripts/`** - Build and watch scripts

## Type Safety

Each folder has its own `tsconfig.json` that restricts which type definitions are available:

- Files in `ext-ts/client/` cannot access server-only types
- Files in `ext-ts/server/` cannot access client-only types
- Files in `ext-ts/shared/` can only access shared types

This is enforced through the `types.d.ts` files in each folder, which use triple-slash directives to explicitly reference only the allowed type definitions.

## Usage

1. Place your client-side code in `ext-ts/client/`
2. Place your server-side code in `ext-ts/server/`
3. Place shared code in `ext-ts/shared/`
4. TypeScript will automatically enforce type restrictions based on the folder

## Building

To compile TypeScript to Lua, use:

```bash
# Build all folders (client, server, shared)
bun run build

# Watch mode - rebuilds all folders on file changes
bun run watch

# Build individual folders
bun run build:client
bun run build:server
bun run build:shared

# Watch individual folders
bun run watch:client
bun run watch:server
bun run watch:shared
```

The compiled Lua files will be output to `../ext/` with the same folder structure (`ext/client/`, `ext/server/`, `ext/shared/`). Each folder gets its own `lualib_bundle.lua` so they are self-contained.

## Regenerating Types

To refresh the type definitions, run the generator command:

```bash
bunx vu-ts generate
```

