#!/usr/bin/env bun

import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import {
  executeInitCommand,
  executeTypesCommand,
  showVersion,
  type InitCommandOptions,
  type TypesCommandOptions,
} from "./cli-service";
import {
  executeEventAddCommand,
  executeEventListCommand,
  executeEventRemoveCommand,
  type EventAddCommandOptions,
  type EventListCommandOptions,
} from "./cli-service-events";
import {
  executeNetEventAddCommand,
  executeNetEventListCommand,
  executeNetEventRemoveCommand,
  type NetEventAddCommandOptions,
  type NetEventListCommandOptions,
} from "./cli-service-netevents";

yargs(hideBin(process.argv))
  .scriptName("vu-ts")
  .usage("Usage: $0 <command> [options]")
  .version(false) // We'll handle version ourselves
  .wrap(Math.min(120, process.stdout.columns)) // Wrap at 120 chars or terminal width
  .strictCommands() // Require exact command matches, no prefix matching

  // Main help text
  .epilogue(
    `
Examples:
  vu-ts init my-mod              Create a new mod project in ./my-mod
  vu-ts init --output ./mods     Create in custom directory
  vu-ts types                    Generate types to ./typings
  vu-ts types --output ./src     Generate types to custom location
  vu-ts init my-mod --force      Create project, overwriting if it exists
  vu-ts init --refresh           Update existing project, preserving code
  vu-ts event add --context server --name "MyMod:Event" --param player:Player
  vu-ts event list               List all custom events
`
  )

  // Version command
  .command("version", "Show version number", {}, () => {
    showVersion();
  })

  // Init command
  .command(
    "init <name>",
    "Create a new mod project with TypeScript types",
    (yargs) => {
      return yargs
        .positional("name", {
          describe: "Name of the mod project",
          type: "string",
          demandOption: true,
        })
        .option("output", {
          alias: "o",
          describe: "Output directory for the project",
          type: "string",
          defaultDescription: "current directory",
        })
        .option("force", {
          alias: "f",
          describe: "Overwrite existing project directory",
          type: "boolean",
        })
        .option("refresh", {
          alias: "r",
          describe: "Update existing project, preserving custom code",
          type: "boolean",
        })
        .conflicts("force", "refresh")
        .example("$0 init my-mod", "Create project in ./my-mod")
        .example(
          "$0 init --output ./projects/my-mod",
          "Create in custom location"
        )
        .example("$0 init my-mod --force", "Overwrite if exists");
    },
    (argv) => executeInitCommand(argv as InitCommandOptions)
  )

  // Types command
  .command(
    "types",
    "Generate/update TypeScript declaration files only",
    (yargs) => {
      return yargs
        .option("output", {
          alias: "o",
          describe: "Output directory for type definitions",
          type: "string",
          defaultDescription: "./typings",
        })
        .option("refresh", {
          alias: "r",
          describe: "Update existing types, preserving custom files",
          type: "boolean",
        })
        .example("$0 types", "Generate types to ./typings")
        .example("$0 types --output ./src", "Generate to custom location");
    },
    (argv) => executeTypesCommand(argv as TypesCommandOptions)
  )

  // Event command (single entrypoint to avoid yargs command-prefix ambiguity)
  .command(
    "event <action>",
    "Manage custom events for your mod",
    (yargs) => {
      return yargs
        .positional("action", {
          describe: "Action to perform",
          type: "string",
          choices: ["add", "remove", "list"],
          demandOption: true,
        })
        .option("context", {
          alias: "c",
          describe: "Event context (client, server, or shared)",
          type: "string",
          choices: ["client", "server", "shared"],
        })
        .option("name", {
          alias: "n",
          describe: 'Event name (e.g., "MyMod:PlayerJoined")',
          type: "string",
        })
        .option("param", {
          alias: "p",
          describe:
            'Event parameter in format "name:type" (can be used multiple times)',
          type: "array",
          default: [],
        })
        .option("mod-root", {
          alias: "m",
          describe:
            "Mod root directory (default: current directory or auto-detect)",
          type: "string",
        })
        .example(
          '$0 event add --context server --name "MyMod:PlayerJoined" --param player:Player --param joinTime:number',
          "Add a server event with parameters"
        )
        .example(
          '$0 event remove --context server --name "MyMod:PlayerJoined"',
          "Remove a server event"
        )
        .example("$0 event list", "List all custom events")
        .example("$0 event list --context server", "List only server events")
        .example("$0 event list --mod-root ./my-mod", "List events from a mod");
    },
    async (argv) => {
      const action = argv.action as "add" | "remove" | "list";
      const modRoot = argv["mod-root"] as string | undefined;

      if (action === "list") {
        await executeEventListCommand({
          context: argv.context as EventListCommandOptions["context"],
          modRoot,
        });
        return;
      }

      // add/remove require context + name
      const context = argv.context as
        | EventAddCommandOptions["context"]
        | undefined;
      const name = argv.name as string | undefined;

      if (!context) {
        throw new Error(
          `Missing required option: --context (client|server|shared) for "event ${action}"`
        );
      }
      if (!name) {
        throw new Error(
          `Missing required option: --name for "event ${action}"`
        );
      }

      if (action === "add") {
        await executeEventAddCommand({
          context,
          name,
          params: (argv.param as unknown[]).map(String),
          modRoot,
        });
        return;
      }

      await executeEventRemoveCommand({
        context,
        name,
        modRoot,
      });
    }
  )

  // NetEvent command (client/server)
  .command(
    "netevent <action>",
    "Manage custom netevents for your mod",
    (yargs) => {
      return yargs
        .positional("action", {
          describe: "Action to perform",
          type: "string",
          choices: ["add", "remove", "list"],
          demandOption: true,
        })
        .option("context", {
          alias: "c",
          describe: "NetEvent context (client or server)",
          type: "string",
          choices: ["client", "server"],
        })
        .option("name", {
          alias: "n",
          describe: 'NetEvent name (e.g., "MyMod:MyNetEvent")',
          type: "string",
        })
        .option("param", {
          alias: "p",
          describe:
            'NetEvent parameter in format "name:type" (can be used multiple times)',
          type: "array",
          default: [],
        })
        .option("mod-root", {
          alias: "m",
          describe:
            "Mod root directory (default: current directory or auto-detect)",
          type: "string",
        })
        .example(
          '$0 netevent add --context server --name "MyMod:Foo" --param data:string',
          "Add a server netevent (typed Broadcast*/SendTo* + Subscribe overloads)"
        )
        .example(
          '$0 netevent add --context client --name "MyMod:Foo" --param data:string',
          "Add a client netevent (typed Send* + Subscribe overloads)"
        )
        .example("$0 netevent list", "List all custom netevents")
        .example(
          "$0 netevent list --context server",
          "List only server netevents"
        );
    },
    async (argv) => {
      const action = argv.action as "add" | "remove" | "list";
      const modRoot = argv["mod-root"] as string | undefined;

      if (action === "list") {
        await executeNetEventListCommand({
          context: argv.context as NetEventListCommandOptions["context"],
          modRoot,
        });
        return;
      }

      const context = argv.context as NetEventAddCommandOptions["context"] | undefined;
      const name = argv.name as string | undefined;

      if (!context) {
        throw new Error(
          `Missing required option: --context (client|server) for "netevent ${action}"`
        );
      }
      if (!name) {
        throw new Error(
          `Missing required option: --name for "netevent ${action}"`
        );
      }

      if (action === "add") {
        await executeNetEventAddCommand({
          context,
          name,
          params: (argv.param as unknown[]).map(String),
          modRoot,
        });
        return;
      }

      await executeNetEventRemoveCommand({
        context,
        name,
        modRoot,
      });
    }
  )

  // Global options
  .option("help", {
    alias: "h",
    describe: "Show help",
    type: "boolean",
    global: true,
  })

  // Require a command
  .demandCommand(
    1,
    "You need to specify a command. Use --help to see available commands."
  )

  // Error handling
  .fail((msg, err, yargs) => {
    if (err) {
      throw err;
    }
    console.error(`\n❌ Error: ${msg}\n`);
    yargs.showHelp();
    process.exit(1);
  })

  .parseAsync()
  .catch((error) => {
    if (error.message) {
      console.error("\n❌ Error:");
      // Format multi-line errors nicely
      const lines = error.message.split("\n");
      console.error(lines[0]);
      if (lines.length > 1) {
        lines.slice(1).forEach((line) => console.error(`   ${line}`));
      }
    } else {
      console.error("\n❌ An unexpected error occurred:");
      console.error(error);
    }
    process.exit(1);
  });
