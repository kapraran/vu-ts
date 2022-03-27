const got = require("got");
const { pathExists, createWriteStream, ensureFile } = require("fs-extra");
const AdmZip = require("adm-zip");

async function downloadRepo(repoUrl, outPath) {
  console.log("downloadRepo()");

  if (await pathExists(outPath)) {
    return;
  }

  await ensureFile(outPath);

  return new Promise((resolve, reject) => {
    const outStream = createWriteStream(outPath);
    const downloadStream = got(repoUrl, { isStream: true });

    downloadStream.pipe(outStream);
    downloadStream.on("end", resolve);
    downloadStream.on("error", reject);
  });
}

async function extractRepo(zipPath, outPath) {
  console.log("extractRepo()");

  if (!(await pathExists(outPath))) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outPath, true);
  }
}

module.exports = {
  downloadRepo,
  extractRepo,
};
