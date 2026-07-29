const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const responsiveImages = require("../src/data/responsive-images.json");

const rootDirectory = path.resolve(__dirname, "..");
const staticDirectory = path.join(rootDirectory, "static");
const outputDirectory = path.join(staticDirectory, "img", "responsive");

function getVariantPath(src, width, extension) {
  const sourceExtension = path.extname(src);
  const sourcePath = src.startsWith("/img/") ? src.slice("/img/".length) : src.replace(/^\//, "");
  const basePath = sourcePath.slice(0, -sourceExtension.length);

  return path.join(outputDirectory, `${basePath}-${width}.${extension}`);
}

async function writeVariant(sourcePath, outputPath, width, format) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const image = sharp(sourcePath).resize({ width, withoutEnlargement: true });
  if (format === "webp") {
    await image.webp({ quality: 82 }).toFile(outputPath);
  } else if (format === "png") {
    await image.png({ compressionLevel: 9 }).toFile(outputPath);
  } else {
    await image.jpeg({ quality: 85, mozjpeg: true }).toFile(outputPath);
  }
}

async function generateImage(src, config) {
  if (!src.startsWith("/img/") || src.includes("..")) {
    throw new Error(`${src} must be a root-relative path below /img`);
  }

  const sourcePath = path.join(staticDirectory, src.replace(/^\//, ""));
  const metadata = await sharp(sourcePath).metadata();

  if (metadata.width !== config.width || metadata.height !== config.height) {
    throw new Error(
      `${src} metadata changed: expected ${config.width}x${config.height}, found ${metadata.width}x${metadata.height}`,
    );
  }

  const extension = path.extname(src).slice(1).toLowerCase();
  if (!["jpg", "jpeg", "png"].includes(extension)) {
    throw new Error(`${src} uses unsupported responsive image format: ${extension}`);
  }

  const widths = [...new Set(config.widths)].sort((a, b) => a - b);
  if (widths.length === 0 || widths.some((width) => width <= 0 || width > config.width)) {
    throw new Error(`${src} has invalid responsive widths`);
  }

  const variants = widths.flatMap((width) => {
    const webpVariant = writeVariant(sourcePath, getVariantPath(src, width, "webp"), width, "webp");
    if (width === config.width) {
      return [webpVariant];
    }
    return [
      webpVariant,
      writeVariant(sourcePath, getVariantPath(src, width, extension), width, extension),
    ];
  });

  await Promise.all(variants);

  return variants.length;
}

async function main() {
  let generatedCount = 0;

  await fs.rm(outputDirectory, { recursive: true, force: true });

  for (const [src, config] of Object.entries(responsiveImages)) {
    generatedCount += await generateImage(src, config);
  }

  console.log(`Generated ${generatedCount} responsive image variants.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
