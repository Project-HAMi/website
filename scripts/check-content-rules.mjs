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
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Repository to check. CI passes --root to check a PR checkout with the trusted copy of this script.
let repoRoot = fileURLToPath(new URL("..", import.meta.url));

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

/** Label a maintainer adds to accept new content-rules allow/off markers in a PR. */
export const EXCEPTION_LABEL = "content-rules-exception";

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

/** CSS named colors (CSS Color Module Level 4), as #rrggbb. */
const NAMED_COLORS = Object.fromEntries(
  (
    "aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc " +
    "bisque:ffe4c4 black:000000 blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a " +
    "burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e coral:ff7f50 " +
    "cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c cyan:00ffff darkblue:00008b darkcyan:008b8b " +
    "darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b " +
    "darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 " +
    "darksalmon:e9967a darkseagreen:8fbc8f darkslateblue:483d8b darkslategray:2f4f4f " +
    "darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff " +
    "dimgray:696969 dimgrey:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 " +
    "forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 " +
    "goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f grey:808080 honeydew:f0fff0 " +
    "hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa " +
    "lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 " +
    "lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 lightgrey:d3d3d3 " +
    "lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa " +
    "lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 " +
    "limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa " +
    "mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 " +
    "mediumslateblue:7b68ee mediumspringgreen:00fa9a mediumturquoise:48d1cc mediumvioletred:c71585 " +
    "midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead " +
    "navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 " +
    "orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 " +
    "papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 " +
    "purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f royalblue:4169e1 " +
    "saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee " +
    "sienna:a0522d silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 slategrey:708090 " +
    "snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 " +
    "tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 " +
    "yellow:ffff00 yellowgreen:9acd32"
  )
    .split(" ")
    .map((pair) => {
      const [name, hex] = pair.split(":");
      return [name, `#${hex}`];
    }),
);

/** Properties and SVG attributes whose value is a color. */
const COLOR_PROPERTY =
  /(?<![\w-])(?:color|fill|stroke|background|background-color|border(?:-[a-z]+)?-color|border|outline|outline-color|stop-color|flood-color|lighting-color|caret-color|accent-color|text-decoration-color|backgroundColor|borderColor)\s*[:=]\s*\{?\s*["'`]?([^;"'`}]*)/g;

/** Colors in a line that are not in the palette. Black is allowed only with transparency (shadows). */
export function findOffBrandColors(line, palette) {
  const bad = [];
  for (const m of line.matchAll(COLOR_PROPERTY)) {
    for (const word of m[1].toLowerCase().match(/(?<![\w#(-])[a-z]+(?![\w(-])/g) ?? []) {
      const hex = NAMED_COLORS[word];
      if (hex && !palette.has(hex)) bad.push(word);
    }
  }
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

/** Split on commas that are not inside parentheses, so `var(--a, b)` stays whole. */
function splitOutsideParens(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
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
      for (const raw of splitOutsideParens(value)) {
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
    // off/on switch only outside code fences, so an example of the markers does not
    // turn the check off. A one-line allow works everywhere, e.g. as a mermaid %% comment.
    if (!fence && marker(line, "off")) off = true;
    const allowed = off || marker(line, "allow") || (i > 0 && marker(lines[i - 1], "allow"));
    if (!fence && marker(line, "on")) off = false;
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

/** Exempt lines of a non-Markdown file (CSS, SVG, JS): allow, and off/on blocks. */
export function exemptLines(lines) {
  let off = false;
  return lines.map((line, i) => {
    if (marker(line, "off")) off = true;
    const allowed = off || marker(line, "allow") || (i > 0 && marker(lines[i - 1], "allow"));
    if (marker(line, "on")) off = false;
    return allowed;
  });
}

/** Undo git's C-style quoting of a path, e.g. "b/caf\303\251.md". */
export function unquoteGitPath(path) {
  if (!path.startsWith('"')) return path;
  const bytes = [];
  const body = path.slice(1, -1);
  const simple = { n: 10, t: 9, r: 13, '"': 34, "\\": 92, a: 7, b: 8, f: 12, v: 11 };
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "\\") {
      bytes.push(...Buffer.from(body[i], "utf8"));
    } else if (/[0-7]/.test(body[i + 1])) {
      bytes.push(parseInt(body.slice(i + 1, i + 4), 8));
      i += 3;
    } else {
      bytes.push(simple[body[i + 1]] ?? body.charCodeAt(i + 1));
      i += 1;
    }
  }
  return Buffer.from(bytes).toString("utf8");
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
  const diff = git([
    "-c",
    "core.quotePath=false",
    "diff",
    "--unified=0",
    "--diff-filter=AMR",
    "--no-color",
    "--no-ext-diff",
    "--src-prefix=a/",
    "--dst-prefix=b/",
    ...range,
  ]);
  const files = new Map();
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      const path = unquoteGitPath(line.slice(4));
      file = path === "/dev/null" ? null : path.slice(2);
      if (file) files.set(file, new Set());
    } else if (line.startsWith("Binary files")) {
      const name = line.match(/ ("?b\/.+"?) differ$/)?.[1];
      if (name) files.set(unquoteGitPath(name).slice(2), null);
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
  const rootIndex = args.indexOf("--root");
  if (rootIndex >= 0) repoRoot = resolve(args[rootIndex + 1]);

  const brandText = all
    ? readFileSync(join(repoRoot, "BRAND.md"), "utf8")
    : git(["show", `${base ?? "origin/master"}:BRAND.md`]);
  const palette = brandPalette(brandText);
  const fonts = brandFonts(brandText);

  const changed = all ? allFiles() : addedLines(base);
  const problems = [];
  const exceptions = [];
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
    const exempt = content ? null : exemptLines(lines);

    lines.forEach((line, i) => {
      const n = i + 1;
      if (!isNew(n)) return;
      const kind = kinds?.[i];
      if (marker(line, "allow") || marker(line, "off")) exceptions.push(`${file}:${n}`);
      const allowed = kind ? kind.allowed : exempt[i];
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
  const pr =
    !all && eventPath && existsSync(eventPath)
      ? JSON.parse(readFileSync(eventPath, "utf8")).pull_request
      : null;
  if (pr && pr.user?.type !== "Bot") {
    for (const missing of missingDeclarations(pr.body)) {
      report("PR description", 0, `check the content declaration "${missing}"`);
    }
  }
  // Exception markers switch the check off, so only a maintainer can approve them.
  // Contributors from forks cannot add labels.
  const approved = pr?.labels?.some((l) => l.name === EXCEPTION_LABEL);
  if (!all && !approved) {
    for (const where of exceptions) {
      const [file, line] = where.split(/:(?=\d+$)/);
      report(
        file,
        Number(line),
        `content-rules exception needs the "${EXCEPTION_LABEL}" label from a maintainer`,
      );
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
