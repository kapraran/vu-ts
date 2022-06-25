import { resolve } from "path";

export const VU_DOCS_REPO_URL =
  "https://github.com/EmulatorNexus/VU-Docs/archive/master.zip";

export const CACHE_DIR = resolve(__dirname, "../.cache");

export const REPO_ZIP_DL_DIR = resolve(CACHE_DIR, "master.zip");

export const REPO_ZIP_EXTRACT_DIR = resolve(CACHE_DIR, "extracted");

export const VUNamespaces = ["fb", "shared", "client", "server"];

export const VUSubDirs = ["type", "library", "event", "hook"];

// const typingsDir = "typings";
