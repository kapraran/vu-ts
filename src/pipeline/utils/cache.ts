import { createHash } from "crypto";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  readdirSync,
} from "fs";
import { resolve } from "path";
import type { CacheProvider } from "../interfaces";
import { CACHE_DIR } from "../../config";

export class MemoryCache implements CacheProvider {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private maxSize = 1000;
  private ttl = 3600000; // 1 hour

  async get<T>(key: string): Promise<T | undefined> {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export class DiskCache implements CacheProvider {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(key: string): string {
    const hash = createHash("sha256").update(key).digest("hex");
    return resolve(this.cacheDir, `${hash}.json`);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const filePath = this.getCacheFilePath(key);

    if (!existsSync(filePath)) {
      return undefined;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      const cached = JSON.parse(content);

      // Check if TTL expired
      if (Date.now() - cached.timestamp > cached.ttl) {
        unlinkSync(filePath);
        return undefined;
      }

      return cached.value as T;
    } catch {
      unlinkSync(filePath);
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const filePath = this.getCacheFilePath(key);
    const cacheData = {
      value,
      timestamp: Date.now(),
      ttl: 3600000, // 1 hour
    };

    writeFileSync(filePath, JSON.stringify(cacheData, null, 2));
  }

  async has(key: string): Promise<boolean> {
    const filePath = this.getCacheFilePath(key);
    return existsSync(filePath);
  }

  async clear(): Promise<void> {
    const files = existsSync(this.cacheDir) ? readdirSync(this.cacheDir) : [];

    for (const file of files) {
      unlinkSync(resolve(this.cacheDir, file));
    }
  }
}

export function createCacheProvider(): CacheProvider {
  const cacheSubDir = resolve(CACHE_DIR, "pipeline");
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "production"
  ) {
    return new DiskCache(cacheSubDir);
  }
  return new MemoryCache();
}
