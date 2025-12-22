#!/usr/bin/env bun

// Watch script that runs all three TypeScriptToLua watch processes in parallel
const processes = [
  Bun.spawn(["tstl", "-p", "ext-ts/client/tsconfig.json", "--watch"], {
    stdout: "inherit",
    stderr: "inherit",
  }),
  Bun.spawn(["tstl", "-p", "ext-ts/server/tsconfig.json", "--watch"], {
    stdout: "inherit",
    stderr: "inherit",
  }),
  Bun.spawn(["tstl", "-p", "ext-ts/shared/tsconfig.json", "--watch"], {
    stdout: "inherit",
    stderr: "inherit",
  }),
];

console.log("👀 Watching client, server, and shared folders...");
console.log("Press Ctrl+C to stop\n");

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Stopping watch processes...");
  for (const proc of processes) {
    proc.kill();
  }
  await Promise.all(processes.map((p) => p.exited));
  process.exit(0);
});

// Wait for all processes (they run indefinitely in watch mode)
await Promise.all(processes.map((p) => p.exited));
