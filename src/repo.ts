import got from "got";
import { pathExists, createWriteStream, ensureFile } from "fs-extra";
import AdmZip from "adm-zip";

export async function downloadRepo(
  repoUrl: string,
  outPath: string
): Promise<void> {
  if (await pathExists(outPath)) return;

  console.log(`Downloading repo "${repoUrl}" in "${outPath}"`);

  await ensureFile(outPath);

  return new Promise((resolve, reject) => {
    const outStream = createWriteStream(outPath);
    const downloadStream = got(repoUrl, { isStream: true });

    downloadStream.pipe(outStream);
    downloadStream.on("end", resolve);
    downloadStream.on("error", reject);
  });
}

export async function extractRepo(
  zipPath: string,
  outPath: string
): Promise<void> {
  if (await pathExists(outPath)) return;

  console.log(`Extracting repo zip file "${zipPath}" in "${outPath}"`);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(outPath, true);
}
