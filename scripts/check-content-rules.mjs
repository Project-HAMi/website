#!/usr/bin/env node
/**
 * Content Rules check.
 *
 * Enforces the mechanical part of the Writing Style rules in
 * docs/contributor/contribute-docs.md and the visual rules in BRAND.md.
 * Only lines a change adds are checked, so existing pages do not block new PRs.
 *
 *   node scripts/check-content-rules.mjs                 # local: diff against merge base with origin/master
 *   node scripts/check-content-rules.mjs --base HEAD^1   # CI: diff of the PR merge commit
 *   node scripts/check-content-rules.mjs --all           # report every file in the repo
 *
 * In GitHub Actions the PR description is read from GITHUB_EVENT_PATH and must
 * have the three content declarations from .github/PULL_REQUEST_TEMPLATE.md checked.
 *
 * A line is skipped when it, or the line above it, contains `content-rules: allow`.
 * Lines between `content-rules: off` and `content-rules: on` are skipped.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

/** Words and phrases from "Avoid marketing language" in the Writing Style section. */
export const BANNED_PHRASES = [
  "innovative",
  "seamless",
  "seamlessly",
  "robust",
  "powerful",
  "cutting-edge",
  "state-of-the-art",
  "streamline",
  "streamlined",
  "streamlines",
  "leverage",
  "leverages",
  "leveraging",
  "intuitive",
  "comprehensive",
  "in conclusion",
  "in summary",
  "to summarize",
  "delve",
  "delves",
  "dive into",
  "unleash",
  "empower",
  "empowers",
  "game-changer",
  "game-changing",
  "in today's",
  "ever-evolving",
  "whether you're",
  "look no further",
  "key takeaways",
  "it's worth noting",
  "please note",
];

/** Byte markers that tools write into images they generate. */
export const AI_IMAGE_MARKERS = [
  "trainedAlgorithmicMedia", // IPTC digital source type, also used by C2PA
  "DALL-E",
  "DALL\u00b7E",
  "Midjourney",
  "Stable Diffusion",
  "ComfyUI",
  "NovelAI",
  "Adobe Firefly",
  "OpenAI",
  "Imagen",
];

/** Generic CSS font keywords allowed next to the brand fonts. */
const GENERIC_FONTS = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "inherit",
  "initial",
  "unset",
  "revert",
]);

const CONTENT_ROOTS = ["docs", "tutorials", "blog", "i18n", "versioned_docs", "src/pages"];
const DUPLICATE_ROOTS = ["docs", "tutorials"];
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".heic"]);
const STYLE_EXTENSIONS = new Set([".css", ".scss", ".svg", ".js", ".jsx", ".ts", ".tsx"]);
const MIN_DUPLICATE_LENGTH = 120;

/** The three checkboxes under "Content rules" in .github/PULL_REQUEST_TEMPLATE.md. */
export const DECLARATIONS = [
  "A person wrote every sentence in this PR",
  "This PR adds no AI-generated images",
  "Every fact this PR adds lives in one place only",
];

// ---------------------------------------------------------------------------
// Pure checks (exported for tests)
// ---------------------------------------------------------------------------

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phraseRegExp = new RegExp(
  `(?<![\\w-])(${BANNED_PHRASES.map(escapeRegExp).join("|")})(?![\\w-])`,
  "gi",
);
const emojiRegExp = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u;

/** Drop inline code spans, URLs and HTML comments; they are not prose. */
export function proseOf(line) {
  return line
    .replace(/<!--.*?-->/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, "");
}

export function findPhrases(line) {
  return [
    ...proseOf(line)
      .replace(/\u2019/g, "'")
      .matchAll(phraseRegExp),
  ].map((m) => m[1].toLowerCase());
}

export function hasEmDash(line) {
  return proseOf(line).includes("\u2014");
}

export function hasEmoji(line) {
  return emojiRegExp.test(proseOf(line));
}

function normalizeHex(hex) {
  let h = hex.slice(1).toLowerCase();
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  return `#${h.slice(0, 6)}`;
}

/** Every hex and rgb() color in a line of BRAND.md, normalized to #rrggbb. */
export function brandPalette(brandText) {
  return new Set(
    [...brandText.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => normalizeHex(m[0])),
  );
}

/** Font names from the Fonts table in BRAND.md. */
export function brandFonts(brandText) {
  const fonts = new Set(GENERIC_FONTS);
  const section = brandText.split(/^## Fonts/m)[1]?.split(/^## /m)[0] ?? "";
  for (const row of section.split("\n")) {
    const cells = row.split("|").map((c) => c.trim());
    if (cells.length < 4 || /^-+$/.test(cells[1]) || cells[1] === "Role") continue;
    for (const name of [cells[2], ...cells[3].split(",")]) {
      fonts.add(name.replace(/["']/g, "").trim().toLowerCase());
    }
  }
  fonts.delete("");
  return fonts;
}

/** Colors in a line that are not in the palette. Black is allowed only with transparency (shadows). */
export function findOffBrandColors(line, palette) {
  const bad = [];
  for (const m of line.matchAll(
    /(?<![\w&])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
  )) {
    if (!palette.has(normalizeHex(m[0]))) bad.push(m[0]);
  }
  for (const m of line.matchAll(
    /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)/g,
  )) {
    const hex = `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
    const translucent = m[4] !== undefined && m[4] !== "1" && m[4] !== "100%";
    if (palette.has(hex) || (hex === "#000000" && translucent)) continue;
    bad.push(m[0]);
  }
  return bad;
}

/** Font names in a font-family declaration that are not brand fonts. */
export function findOffBrandFonts(line, fonts) {
  const bad = [];
  const declarations = [
    /font-family\s*=\s*"([^"]*)"/g, // SVG attribute
    /font-family\s*=\s*'([^']*)'/g,
    /font-family\s*:\s*([^;}\n]*)/g, // CSS, also inside style="..."
    /fontFamily\s*:\s*(["'`])(.*?)\1/g, // JS style object
  ];
  for (const re of declarations) {
    for (const m of line.matchAll(re)) {
      // Inside an SVG style="..." attribute, stop where the attribute ends.
      const value = m[m.length - 1].replace(/"\s*([\w:-]+=|\/?>|$).*$/, "");
      for (const raw of value.split(",")) {
        const name = raw
          .replace(/["'`]|&quot;/g, "")
          .trim()
          .toLowerCase();
        if (!name || name.startsWith("var(") || fonts.has(name)) continue;
        bad.push(raw.trim());
      }
    }
  }
  return [...new Set(bad)];
}

export function findAiImageMarkers(buffer) {
  const text = buffer.toString("latin1");
  const found = AI_IMAGE_MARKERS.filter((marker) => text.includes(marker));
  // AUTOMATIC1111 writes its generation settings into a PNG text chunk.
  if (text.includes("Steps:") && text.includes("Sampler:"))
    found.push("Stable Diffusion parameters");
  return found;
}

export function missingDeclarations(body) {
  return DECLARATIONS.filter(
    (text) => !new RegExp(`[-*]\\s*\\[[xX]\\]\\s*${escapeRegExp(text)}`).test(body ?? ""),
  );
}

/**
 * Walk a file's lines and say, for each, whether it is prose, inside a code
 * fence (with its language), or switched off with content-rules markers.
 */
const marker = (line, name) =>
  new RegExp(`content-rules:\\s*${name}\\b`).test(line.replace(/`[^`]*`/g, ""));

export function classifyLines(lines) {
  const out = [];
  let fence = null;
  let off = false;
  let frontMatter = lines[0] === "---";
  lines.forEach((line, i) => {
    if (marker(line, "off")) off = true;
    const allowed = off || marker(line, "allow") || (i > 0 && marker(lines[i - 1], "allow"));
    if (marker(line, "on")) off = false;
    if (frontMatter) {
      out.push({ kind: "frontmatter", allowed });
      if (i > 0 && line === "---") frontMatter = false;
      return;
    }
    const open = line.match(/^\s*(```+|~~~+)\s*([\w-]*)/);
    if (fence) {
      if (
        open &&
        open[1][0] === fence.marker[0] &&
        open[1].length >= fence.marker.length &&
        !open[2]
      ) {
        out.push({ kind: "fence", lang: fence.lang, allowed });
        fence = null;
      } else {
        out.push({ kind: "code", lang: fence.lang, allowed });
      }
      return;
    }
    if (open) {
      fence = { marker: open[1], lang: open[2].toLowerCase() };
      out.push({ kind: "fence", lang: fence.lang, allowed });
      return;
    }
    out.push({ kind: "prose", allowed });
  });
  return out;
}

/** Paragraphs of plain prose, normalized for comparison. */
export function paragraphs(text) {
  const lines = text.split("\n");
  const kinds = classifyLines(lines);
  const result = [];
  let current = [];
  const flush = () => {
    if (current.length) {
      const norm = current
        .map((c) => c.text)
        .join(" ")
        .toLowerCase()
        .replace(/[`*_>#[\]()]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (norm.length >= MIN_DUPLICATE_LENGTH) {
        result.push({ norm, lines: current.map((c) => c.line) });
      }
    }
    current = [];
  };
  lines.forEach((line, i) => {
    const plain =
      kinds[i].kind === "prose" &&
      !kinds[i].allowed &&
      line.trim() !== "" &&
      !/^\s*(#|\||<|:::|import |export |!\[)/.test(line);
    if (plain) current.push({ text: line, line: i + 1 });
    else flush();
  });
  flush();
  return result;
}

// ---------------------------------------------------------------------------
// Git and file access
// ---------------------------------------------------------------------------

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 1 << 28 });
}

/** Map of changed file -> Set of added line numbers (null = whole file is new or binary). */
function addedLines(base) {
  const range = base ? [base] : ["--merge-base", "origin/master"];
  const diff = git(["diff", "--unified=0", "--diff-filter=AM", "--no-color", ...range]);
  const files = new Map();
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line === "+++ /dev/null" ? null : line.slice(6);
      if (file) files.set(file, new Set());
    } else if (line.startsWith("Binary files") && line.includes(" b/")) {
      const name = line.match(/ b\/(.+) differ$/)?.[1];
      if (name) files.set(name, null);
    } else if (file && line.startsWith("@@")) {
      const [, start, count] = line.match(/\+(\d+)(?:,(\d+))?/);
      for (let n = 0; n < Number(count ?? 1); n++) files.get(file).add(Number(start) + n);
    }
  }
  return files;
}

function walk(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", "build", ".docusaurus", ".git"].includes(entry.name)) walk(full, found);
    } else {
      found.push(relative(repoRoot, full));
    }
  }
  return found;
}

function allFiles() {
  const files = new Map();
  for (const root of [...CONTENT_ROOTS, "src", "static"]) {
    for (const f of walk(join(repoRoot, root))) files.set(f, null);
  }
  return files;
}

/** Generated from CHANGELOG.md, not written by hand. */
const GENERATED = [
  "changelog/",
  "i18n/zh/changelog-plugin/",
  "i18n/zh/docusaurus-plugin-content-blog-changelog/",
];

const isContent = (f) =>
  /\.mdx?$/.test(f) &&
  CONTENT_ROOTS.some((root) => f.startsWith(`${root}/`)) &&
  !GENERATED.some((g) => f.startsWith(g));
const isChinese = (f) => f.startsWith("i18n/zh/");
const isDuplicateCandidate = (f) =>
  /\.mdx?$/.test(f) && DUPLICATE_ROOTS.some((root) => f.startsWith(`${root}/`));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function run() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const baseIndex = args.indexOf("--base");
  const base = baseIndex >= 0 ? args[baseIndex + 1] : null;

  const brandText = all
    ? readFileSync(join(repoRoot, "BRAND.md"), "utf8")
    : git(["show", `${base ?? "origin/master"}:BRAND.md`]);
  const palette = brandPalette(brandText);
  const fonts = brandFonts(brandText);

  const changed = all ? allFiles() : addedLines(base);
  const problems = [];
  const report = (file, line, message) =>
    problems.push(`${file}${line ? `:${line}` : ""}: ${message}`);

  let duplicateIndex = null;
  const otherParagraphs = () => {
    if (duplicateIndex) return duplicateIndex;
    duplicateIndex = new Map();
    for (const root of DUPLICATE_ROOTS) {
      for (const f of walk(join(repoRoot, root)).filter(isDuplicateCandidate)) {
        for (const p of paragraphs(readFileSync(join(repoRoot, f), "utf8"))) {
          if (!duplicateIndex.has(p.norm)) duplicateIndex.set(p.norm, []);
          duplicateIndex.get(p.norm).push(`${f}:${p.lines[0]}`);
        }
      }
    }
    return duplicateIndex;
  };

  for (const [file, added] of changed) {
    const path = join(repoRoot, file);
    if (
      !existsSync(path) ||
      file === "BRAND.md" ||
      file.startsWith("scripts/") ||
      file.startsWith("test/")
    ) {
      continue;
    }
    const ext = extname(file).toLowerCase();
    const isNew = (n) => added === null || added.has(n);

    if (IMAGE_EXTENSIONS.has(ext)) {
      const buffer = readFileSync(path);
      if (buffer.subarray(0, 40).toString().startsWith("version https://git-lfs")) {
        report(file, 0, "image is a Git LFS pointer, run `git lfs pull` to check it");
        continue;
      }
      const markers = findAiImageMarkers(buffer);
      if (markers.length)
        report(file, 0, `image metadata says AI-generated (${markers.join(", ")})`);
      continue;
    }

    const content = /\.mdx?$/.test(file);
    if (!content && !STYLE_EXTENSIONS.has(ext)) continue;

    const lines = readFileSync(path, "utf8").split("\n");
    const kinds = content ? classifyLines(lines) : null;

    lines.forEach((line, i) => {
      const n = i + 1;
      if (!isNew(n)) return;
      const kind = kinds?.[i];
      const allowed = kind
        ? kind.allowed
        : marker(line, "allow") || (i > 0 && marker(lines[i - 1], "allow"));
      if (allowed) return;

      if (content && isContent(file) && kind.kind === "prose") {
        if (!isChinese(file)) {
          for (const p of findPhrases(line)) report(file, n, `avoid "${p}" (Writing Style)`);
          if (hasEmDash(line))
            report(file, n, "use a hyphen instead of an em-dash (Writing Style)");
        }
        if (hasEmoji(line)) report(file, n, "no emoji in content (Writing Style)");
      }

      const styled =
        !content ||
        (kind.kind === "code" && kind.lang === "mermaid") ||
        (kind.kind === "prose" && /style\s*=/.test(line));
      if (styled) {
        for (const c of findOffBrandColors(line, palette)) {
          report(file, n, `color ${c} is not in BRAND.md`);
        }
        for (const f of findOffBrandFonts(line, fonts)) {
          report(file, n, `font ${f} is not in BRAND.md`);
        }
      }
    });

    if (isDuplicateCandidate(file)) {
      const index = otherParagraphs();
      for (const p of paragraphs(lines.join("\n"))) {
        if (!p.lines.some(isNew)) continue;
        const elsewhere = (index.get(p.norm) ?? []).filter((loc) => !loc.startsWith(`${file}:`));
        if (elsewhere.length) {
          report(
            file,
            p.lines[0],
            `paragraph already exists at ${elsewhere[0]}, link to it instead`,
          );
        }
      }
    }
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!all && eventPath && existsSync(eventPath)) {
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    const pr = event.pull_request;
    if (pr && pr.user?.type !== "Bot") {
      for (const missing of missingDeclarations(pr.body)) {
        report("PR description", 0, `check the content declaration "${missing}"`);
      }
    }
  }

  if (problems.length) {
    console.error(problems.join("\n"));
    console.error(
      `\n${problems.length} content rule problem(s). See ` +
        "https://project-hami.io/docs/next/contributor/contribute-docs#writing-style and BRAND.md.",
    );
    if (process.env.GITHUB_ACTIONS) {
      for (const p of problems) {
        const m = p.match(/^(.+?):(\d+): (.*)$/);
        console.log(m ? `::error file=${m[1]},line=${m[2]}::${m[3]}` : `::error::${p}`);
      }
    }
    process.exitCode = 1;
  } else {
    console.log("Content rules: no problems found.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
