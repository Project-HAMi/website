import fs from "node:fs/promises";
import path from "node:path";

const BUILD_DIR = path.resolve(process.cwd(), "build");
const SAME_ORIGIN_HOSTS = new Set(["project-hami.io", "www.project-hami.io"]);
const ASSET_EXTENSIONS = new Set([
  ".apng",
  ".atom",
  ".avif",
  ".css",
  ".csv",
  ".eot",
  ".gif",
  ".gz",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".mp4",
  ".pdf",
  ".png",
  ".rss",
  ".svg",
  ".tgz",
  ".ttf",
  ".txt",
  ".wasm",
  ".webm",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2",
  ".xml",
  ".yaml",
  ".yml",
  ".zip",
]);

const LINK_PATTERN = /\b(?:href|src)=["']([^"'#][^"']*)["']/g;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return fullPath;
    }),
  );
  return files.flat();
}

function isIgnoredLink(rawLink) {
  return (
    rawLink.startsWith("#") ||
    rawLink.startsWith("mailto:") ||
    rawLink.startsWith("tel:") ||
    rawLink.startsWith("javascript:")
  );
}

function normalizePathname(rawLink) {
  let pathname;
  if (rawLink.startsWith("http://") || rawLink.startsWith("https://")) {
    const parsed = new URL(rawLink);
    if (!SAME_ORIGIN_HOSTS.has(parsed.hostname)) {
      return null;
    }
    pathname = parsed.pathname || "/";
  } else if (rawLink.startsWith("/")) {
    pathname = rawLink.split(/[?#]/, 1)[0] || "/";
  } else {
    return null;
  }

  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function getCandidates(pathname) {
  if (pathname === "/") {
    return [path.join(BUILD_DIR, "index.html")];
  }

  const relativePath = pathname.replace(/^\/+/, "");
  const exactPath = path.join(BUILD_DIR, relativePath);
  const extension = path.extname(relativePath).toLowerCase();

  if (ASSET_EXTENSIONS.has(extension)) {
    return [exactPath];
  }

  return [exactPath, `${exactPath}.html`, path.join(exactPath, "index.html")];
}

async function targetExists(pathname) {
  const candidates = getCandidates(pathname);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return true;
    } catch {
      // Keep checking.
    }
  }
  return false;
}

async function main() {
  const htmlFiles = (await walk(BUILD_DIR)).filter((file) => file.endsWith(".html"));
  const brokenLinks = [];

  for (const file of htmlFiles) {
    const source = path.relative(BUILD_DIR, file);
    const html = await fs.readFile(file, "utf8");

    for (const match of html.matchAll(LINK_PATTERN)) {
      const rawLink = match[1];
      if (!rawLink || isIgnoredLink(rawLink)) {
        continue;
      }

      const pathname = normalizePathname(rawLink);
      if (!pathname) {
        continue;
      }

      if (!(await targetExists(pathname))) {
        brokenLinks.push({ source, target: pathname, rawLink });
      }
    }
  }

  if (brokenLinks.length === 0) {
    console.log(
      `Generated-site internal link check passed (${htmlFiles.length} HTML files scanned).`,
    );
    return;
  }

  brokenLinks.sort((left, right) => {
    if (left.target === right.target) {
      return left.source.localeCompare(right.source);
    }
    return left.target.localeCompare(right.target);
  });

  console.error("Broken generated-site internal links:");
  for (const { source, target, rawLink } of brokenLinks) {
    console.error(`- ${target} (from ${source}; raw=${rawLink})`);
  }
  console.error(`Total broken links: ${brokenLinks.length}`);
  process.exitCode = 1;
}

await main();
