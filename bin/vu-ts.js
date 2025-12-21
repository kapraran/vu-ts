#!/usr/bin/env bun
/**
 * Wrapper script for npm package bin field compatibility.
 * 
 * npm's validation rejects .ts files in the bin field, so we use this .js wrapper
 * to satisfy npm's requirements. Bun can execute TypeScript directly, so this
 * wrapper simply imports the actual TypeScript CLI entry point.
 * 
 * When installed via npm/bun, the bin field points here, and Bun will execute
 * this file (thanks to the shebang), which then imports and runs the TypeScript CLI.
 */
import "../src/cli.ts";

