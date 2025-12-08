import AdmZip from "adm-zip";
import { CACHE_METADATA_PATH } from "./config";
import { existsSync } from "fs";

interface CacheMetadata {
  downloadCommit?: string;
  extractCommit?: string;
}

async function readCacheMetadata(): Promise<CacheMetadata> {
  try {
    if (!existsSync(CACHE_METADATA_PATH)) {
      return {};
    }
    const content = await Bun.file(CACHE_METADATA_PATH).text();
    return JSON.parse(content) as CacheMetadata;
  } catch (error) {
    // If cache file is corrupted or missing, treat as cache miss
    return {};
  }
}

async function writeCacheMetadata(metadata: CacheMetadata): Promise<void> {
  try {
    await Bun.write(CACHE_METADATA_PATH, JSON.stringify(metadata, null, 2) + "\n");
  } catch (error) {
    // Silently fail - cache write errors shouldn't block the script
    console.warn(`Warning: Failed to write cache metadata: ${error}`);
  }
}

export async function getLatestCommitHash(): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/EmulatorNexus/VU-Docs/commits/master"
    );
    if (!response.ok) {
      console.warn(`Warning: Failed to fetch commit hash: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    return data.sha as string;
  } catch (error) {
    console.warn(`Warning: Failed to fetch commit hash: ${error}`);
    return null;
  }
}

export async function downloadRepo(
  repoUrl: string,
  outPath: string,
  commitHash: string | null
): Promise<void> {
  // Check cache if we have a commit hash
  if (commitHash) {
    const cache = await readCacheMetadata();
    const fileExists = await Bun.file(outPath).exists();
    
    if (fileExists && cache.downloadCommit === commitHash) {
      console.log(`   ✓ Download cached (commit ${commitHash.substring(0, 7)})`);
      return;
    }
    if (fileExists && cache.downloadCommit) {
      console.log(`   ⬇  Downloading (new commit: ${commitHash.substring(0, 7)})...`);
    } else {
      console.log(`   ⬇  Downloading repository...`);
    }
  } else {
    // Fallback to simple existence check if no commit hash
    if (await Bun.file(outPath).exists()) {
      console.log(`   ✓ Download cached`);
      return;
    }
    console.log(`   ⬇  Downloading repository...`);
  }

  const response = await fetch(repoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await Bun.write(outPath, arrayBuffer);
  console.log(`   ✓ Download complete`);

  // Only update cache after successful download
  if (commitHash) {
    const cache = await readCacheMetadata();
    cache.downloadCommit = commitHash;
    await writeCacheMetadata(cache);
  }
}

export async function extractRepo(
  zipPath: string,
  outPath: string,
  commitHash: string | null
): Promise<void> {
  // Check cache if we have a commit hash
  if (commitHash) {
    const cache = await readCacheMetadata();
    const dirExists = existsSync(outPath);
    
    if (dirExists && cache.extractCommit === commitHash) {
      console.log(`   ✓ Extraction cached (commit ${commitHash.substring(0, 7)})`);
      return;
    }
    if (dirExists) {
      console.log(`   📂 Extracting (updated content)...`);
    } else {
      console.log(`   📂 Extracting archive...`);
    }
  } else {
    // Fallback to simple existence check if no commit hash
    if (existsSync(outPath)) {
      console.log(`   ✓ Extraction cached`);
      return;
    }
    console.log(`   📂 Extracting archive...`);
  }

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(outPath, true);
  console.log(`   ✓ Extraction complete`);

  // Only update cache after successful extraction
  if (commitHash) {
    const cache = await readCacheMetadata();
    cache.extractCommit = commitHash;
    await writeCacheMetadata(cache);
  }
}
