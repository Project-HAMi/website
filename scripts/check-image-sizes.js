const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const allowlist = require("./image-size-allowlist.json");

const MAX_FILE_SIZE = 500 * 1024;
const MAX_DIMENSION = 2560;
const rootDirectory = path.resolve(__dirname, "..");
const staticDirectory = path.join(rootDirectory, "static");
const responsiveDirectory = path.join(staticDirectory, "img", "responsive");
const supportedExtensions = new Set([".jpeg", ".jpg", ".png", ".webp"]);

async function findRasterImages(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const images = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entryPath !== responsiveDirectory) {
        images.push(...(await findRasterImages(entryPath)));
      }
    } else if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
      images.push(entryPath);
    }
  }

  return images;
}

function formatBytes(bytes) {
  return `${Math.ceil(bytes / 1024)} KiB`;
}

async function main() {
  const images = await findRasterImages(staticDirectory);
  const violations = [];
  const staleExemptions = new Set(Object.keys(allowlist));

  await Promise.all(
    images.map(async (imagePath) => {
      const relativePath = path.relative(rootDirectory, imagePath).split(path.sep).join("/");
      const { size } = await fs.stat(imagePath);
      const metadata = await sharp(imagePath).metadata();
      const tooLarge =
        size > MAX_FILE_SIZE || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;

      if (tooLarge && allowlist[relativePath]) {
        staleExemptions.delete(relativePath);
        return;
      }

      if (tooLarge) {
        violations.push(
          `${relativePath} (${metadata.width}x${metadata.height}, ${formatBytes(size)})`,
        );
      }
    }),
  );

  if (violations.length > 0 || staleExemptions.size > 0) {
    if (violations.length > 0) {
      console.error(
        `Raster assets must be at most ${MAX_DIMENSION}px per side and ${formatBytes(MAX_FILE_SIZE)}:\n${violations
          .sort()
          .map((violation) => `- ${violation}`)
          .join("\n")}`,
      );
      console.error(
        "Optimize the asset or add a documented exemption to scripts/image-size-allowlist.json.",
      );
    }

    if (staleExemptions.size > 0) {
      console.error(
        `Remove stale image-size exemptions:\n${[...staleExemptions]
          .sort()
          .map((exemption) => `- ${exemption}`)
          .join("\n")}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(`Checked ${images.length} raster assets against the image-size limits.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
