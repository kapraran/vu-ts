import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export class FeatureFlags {
  private static instance: FeatureFlags;
  private flags: Map<string, boolean> = new Map();
  private flagFilePath: string;

  private constructor() {
    this.flagFilePath = resolve(
      import.meta.dir || __dirname,
      "../../../.vu-ts-flags.json"
    );
    this.loadFromStorage();
    this.loadFromEnv();
  }

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

  getFlag(name: string): boolean | undefined {
    const value = this.flags.get(name);
    return value; // Return undefined if not set, to distinguish from explicit false
  }

  private persistFlags(): void {
    try {
      const flagsArray = Array.from(this.flags.entries());
      writeFileSync(this.flagFilePath, JSON.stringify(flagsArray, null, 2));
    } catch (error) {
      // Silently fail if we can't persist flags
    }
  }

  private loadFromStorage(): void {
    try {
      if (existsSync(this.flagFilePath)) {
        const stored = readFileSync(this.flagFilePath, "utf-8");
        const flags = JSON.parse(stored);
        this.flags = new Map(flags);
      }
    } catch (error) {
      // Silently fail if we can't load flags
    }
  }

  private loadFromEnv(): void {
    if (typeof process !== "undefined" && process.env) {
      // Environment variables override stored flags
      // They are processed after loadFromStorage() so they take precedence
      if (process.env.VU_TS_LEGACY_PIPELINE !== undefined) {
        const value = process.env.VU_TS_LEGACY_PIPELINE === "true";
        this.setFlag("useLegacyPipeline", value);
      }
      if (process.env.VU_TS_ENABLE_PARALLEL !== undefined) {
        const value = process.env.VU_TS_ENABLE_PARALLEL === "true";
        this.setFlag("enableParallel", value);
      }
      if (process.env.VU_TS_ENABLE_CACHING !== undefined) {
        const value = process.env.VU_TS_ENABLE_CACHING === "true";
        this.setFlag("enableCaching", value);
      }
    }
  }
}
