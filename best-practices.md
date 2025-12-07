# TypeScript-to-Lua Best Practices

## Method Binding and Callbacks

### Problem

When passing class methods directly as callbacks to functions like `Events.Subscribe`, you may encounter issues with the `self` parameter in the generated Lua code. This happens because regular class methods in TypeScript-to-Lua require `this` binding, and passing a method reference directly doesn't preserve that binding.

**Example of the problem:**

```typescript
class Test {
  onLevelLoaded(levelName: string, gameMode: string) {
    // This won't work correctly when passed directly
  }
}

const test = new Test();
// ❌ This may cause issues with self parameter
Events.Subscribe("Level:Loaded", test.onLevelLoaded);
```

### Solutions

#### Option 1: Use Arrow Function Wrapper (Recommended for Memory-Conscious Code)

Wrap the method call in an arrow function to preserve the `this` context:

```typescript
Events.Subscribe("Level:Loaded", (...args) => test.onLevelLoaded(...args));
```

**Pros:**

- Works reliably
- Preserves `this` context
- Memory efficient (single function instance per class)

**Cons:**

- Slightly verbose
- Requires rest parameters for type safety

#### Option 2: Use Arrow Function Properties (Recommended for Clean Code)

Define the method as an arrow function property in the class:

```typescript
class Test {
  onLevelLoaded = (levelName: string, gameMode: string) => {
    // Method body
  };
}

const test = new Test();
// ✅ This works directly
Events.Subscribe("Level:Loaded", test.onLevelLoaded);
```

**Pros:**

- Clean syntax - can pass method directly
- Automatically preserves `this` context
- No wrapper needed

**Cons:**

- Each instance gets its own function copy (memory overhead)
- Not suitable for methods that need to be shared across instances

#### Option 3: Use `.bind(this)`

Explicitly bind the method:

```typescript
Events.Subscribe("Level:Loaded", test.onLevelLoaded.bind(test));
```

**Pros:**

- Explicit binding
- Works correctly

**Cons:**

- Verbose
- Must remember to bind every time

#### Option 4: Use `this: void` (Only if method doesn't need `this`)

If your method doesn't use `this`, you can mark it explicitly:

```typescript
class Test {
  onLevelLoaded(this: void, levelName: string, gameMode: string) {
    // Method cannot use 'this' inside
  }
}
```

**Pros:**

- Can pass method directly
- No wrapper needed

**Cons:**

- Method cannot access `this` or instance properties
- Very limited use case

### Recommendation

- **For most cases**: Use **Option 2** (arrow function properties) if memory is not a concern. It provides the cleanest syntax.
- **For memory-sensitive code**: Use **Option 1** (arrow function wrapper) to avoid creating multiple function instances.
- **For static/utility methods**: Use **Option 4** (`this: void`) if the method truly doesn't need instance context.

## Event Callbacks and `this: void`

All event callbacks in the generated type definitions include `this: void` as the first parameter. This prevents TypeScript-to-Lua from adding an implicit `self` parameter (`____`) to the generated Lua code.

**Example:**

```typescript
// Generated type definition
function Subscribe(
  eventName: "Level:Loaded",
  callback: (
    this: void, // ← Prevents self parameter
    levelName: string,
    gameMode: string
  ) => void
): Event;
```

This ensures that when you write:

```typescript
Events.Subscribe("Level:Loaded", (levelName, gameMode) => {
  // callback code
});
```

The generated Lua code will be:

```lua
Events:Subscribe(
    "Level:Loaded",
    function(levelName, gameMode)
        -- callback code
    end
)
```

Instead of:

```lua
Events:Subscribe(
    "Level:Loaded",
    function(____, levelName, gameMode)  -- ← Unwanted self parameter
        -- callback code
    end
)
```

## TypeScript-to-Lua Configuration

### Recommended Settings

The `tsconfig.base.json` includes the following TypeScript-to-Lua configuration:

```json
{
  "tstl": {
    "luaTarget": "5.1"
  }
}
```

**Note:** We removed `noImplicitSelf: true` because:

- Event callbacks already have `this: void` in their type definitions
- This provides explicit control per callback type
- Avoids potential conflicts with other code that may legitimately need `this`

### Lua Library Import

The configuration uses the default `luaLibImport` setting (which generates `lualib_bundle.lua`). Each folder (client, server, shared) is built separately, so each gets its own `lualib_bundle.lua` file in its output directory. This ensures each folder is self-contained and can find the library bundle.

## Folder Structure and Type Safety

- **`ext-ts/client/`** - Client-side code (has access to `shared.d.ts` and `client.d.ts` types)
- **`ext-ts/server/`** - Server-side code (has access to `shared.d.ts` and `server.d.ts` types)
- **`ext-ts/shared/`** - Shared code (has access to `shared.d.ts` types only)

TypeScript will enforce these restrictions at compile time, preventing you from accidentally using client-only types in server code or vice versa.
