import AdmZip from "adm-zip";

export async function downloadRepo(
  repoUrl: string,
  outPath: string
): Promise<void> {
  if (await Bun.file(outPath).exists()) return;

  console.log(`Downloading repo "${repoUrl}" in "${outPath}"`);

  const response = await fetch(repoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await Bun.write(outPath, arrayBuffer);
}

export async function extractRepo(
  zipPath: string,
  outPath: string
): Promise<void> {
  if (await Bun.file(outPath).exists()) return;

  console.log(`Extracting repo zip file "${zipPath}" in "${outPath}"`);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(outPath, true);
}
