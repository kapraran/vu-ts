#!/usr/bin/env bun

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import {
  executeInitCommand,
  executeTypesCommand,
  showVersion,
  type InitCommandOptions,
  type TypesCommandOptions
} from './cli-service';

yargs(hideBin(process.argv))
  .scriptName('vu-ts')
  .usage('Usage: $0 <command> [options]')
  .version(false) // We'll handle version ourselves
  .wrap(Math.min(120, process.stdout.columns)) // Wrap at 120 chars or terminal width

  // Main help text
  .epilogue(`
Examples:
  vu-ts init my-mod              Create a new mod project in ./my-mod
  vu-ts init --output ./mods     Create in custom directory
  vu-ts types                    Generate types to ./typings
  vu-ts types --output ./src     Generate types to custom location
  vu-ts init my-mod --force      Create project, overwriting if it exists
  vu-ts init --refresh           Update existing project, preserving code
`)

  // Version command
  .command('version', 'Show version number', {}, () => {
    showVersion();
  })

  // Init command
  .command(
    'init <name>',
    'Create a new mod project with TypeScript types',
    (yargs) => {
      return yargs
        .positional('name', {
          describe: 'Name of the mod project',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output directory for the project',
          type: 'string',
          defaultDescription: 'current directory',
        })
        .option('force', {
          alias: 'f',
          describe: 'Overwrite existing project directory',
          type: 'boolean',
        })
        .option('refresh', {
          alias: 'r',
          describe: 'Update existing project, preserving custom code',
          type: 'boolean',
        })
        .conflicts('force', 'refresh')
        .example('$0 init my-mod', 'Create project in ./my-mod')
        .example('$0 init --output ./projects/my-mod', 'Create in custom location')
        .example('$0 init my-mod --force', 'Overwrite if exists');
    },
    (argv) => executeInitCommand(argv as InitCommandOptions)
  )

  // Types command
  .command(
    'types',
    'Generate/update TypeScript declaration files only',
    (yargs) => {
      return yargs
        .option('output', {
          alias: 'o',
          describe: 'Output directory for type definitions',
          type: 'string',
          defaultDescription: './typings',
        })
        .option('refresh', {
          alias: 'r',
          describe: 'Update existing types, preserving custom files',
          type: 'boolean',
        })
        .example('$0 types', 'Generate types to ./typings')
        .example('$0 types --output ./src', 'Generate to custom location');
    },
    (argv) => executeTypesCommand(argv as TypesCommandOptions)
  )

  // Global options
  .option('help', {
    alias: 'h',
    describe: 'Show help',
    type: 'boolean',
    global: true,
  })

  // Require a command
  .demandCommand(1, 'You need to specify a command. Use --help to see available commands.')

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
      console.error('\n❌ Error:');
      // Format multi-line errors nicely
      const lines = error.message.split('\n');
      console.error(lines[0]);
      if (lines.length > 1) {
        lines.slice(1).forEach(line => console.error(`   ${line}`));
      }
    } else {
      console.error('\n❌ An unexpected error occurred:');
      console.error(error);
    }
    process.exit(1);
  });