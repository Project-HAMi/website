/**
 * Unit tests for scripts/check-content-rules.mjs, the PR check behind the
 * Writing Style section of the docs contribution guide and BRAND.md.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  brandFonts,
  brandPalette,
  classifyLines,
  findAiImageMarkers,
  findOffBrandColors,
  findOffBrandFonts,
  findPhrases,
  hasEmDash,
  hasEmoji,
  missingDeclarations,
  paragraphs,
} from "../scripts/check-content-rules.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const brand = readFileSync(`${repoRoot}/BRAND.md`, "utf8");
const template = readFileSync(`${repoRoot}/.github/PULL_REQUEST_TEMPLATE.md`, "utf8");

describe("content rules: prose", () => {
  it("finds banned phrases as whole words, case-insensitive", () => {
    assert.deepEqual(findPhrases("A Seamless and robust setup."), ["seamless", "robust"]);
    assert.deepEqual(findPhrases("In today\u2019s clusters"), ["in today's"]);
    assert.deepEqual(findPhrases("The scheduler is robustly tested"), []);
  });

  it("ignores inline code and link targets", () => {
    assert.deepEqual(findPhrases("Set `robust: true` in values.yaml"), []);
    assert.deepEqual(findPhrases("See [the guide](https://example.com/seamless)"), []);
  });

  it("flags em-dashes and emoji outside inline code", () => {
    assert.equal(hasEmDash("GPU sharing \u2014 per pod"), true);
    assert.equal(hasEmDash("Use `\u2014` nowhere"), false);
    assert.equal(hasEmoji("Done \u{1F680}"), true);
    assert.equal(hasEmoji("Copyright \u00a9 HAMi"), false);
  });
});

describe("content rules: line classification", () => {
  it("separates prose, code fences and switched-off blocks", () => {
    const lines = [
      "---",
      "title: x",
      "---",
      "Text",
      "```mermaid",
      "A-->B",
      "```",
      "<!-- content-rules: off -->",
      "quoted",
      "<!-- content-rules: on -->",
      "<!-- content-rules: allow -->",
      "allowed",
      "Use `content-rules: off` in docs",
      "after",
    ];
    const kinds = classifyLines(lines);
    assert.equal(kinds[1].kind, "frontmatter");
    assert.equal(kinds[3].kind, "prose");
    assert.deepEqual(kinds[5], { kind: "code", lang: "mermaid", allowed: false });
    assert.equal(kinds[8].allowed, true);
    assert.equal(kinds[11].allowed, true);
    assert.equal(kinds[13].allowed, false, "a marker inside inline code does not count");
  });

  it("builds long prose paragraphs only", () => {
    const long =
      "HAMi shares one GPU between pods by limiting memory and compute per container. ".repeat(2);
    const text = ["# Title", "", long, "", "short", "", "```", long, "```"].join("\n");
    const found = paragraphs(text);
    assert.equal(found.length, 1);
    assert.deepEqual(found[0].lines, [3]);
  });
});

describe("content rules: brand", () => {
  const palette = brandPalette(brand);
  const fonts = brandFonts(brand);

  it("reads colors and fonts from BRAND.md", () => {
    assert.ok(palette.has("#10d05d"));
    assert.ok(fonts.has("space grotesk"));
    assert.ok(fonts.has("consolas"));
  });

  it("accepts brand colors in any notation and flags the rest", () => {
    assert.deepEqual(
      findOffBrandColors("color: #10D05D; fill: rgba(16, 208, 93, 0.3)", palette),
      [],
    );
    assert.deepEqual(findOffBrandColors("box-shadow: 0 1px rgba(0, 0, 0, 0.2)", palette), []);
    assert.deepEqual(findOffBrandColors("color: #123456; background: rgb(0, 0, 0)", palette), [
      "#123456",
      "rgb(0, 0, 0)",
    ]);
    assert.deepEqual(findOffBrandColors("[link](#abc-section) &#x2014;", palette), []);
  });

  it("checks fonts in CSS, SVG and JS", () => {
    assert.deepEqual(findOffBrandFonts("font-family: var(--hami-font-body);", fonts), []);
    assert.deepEqual(
      findOffBrandFonts(`font-family: "Space Grotesk", "Comic Sans MS", sans-serif;`, fonts),
      [`"Comic Sans MS"`],
    );
    assert.deepEqual(findOffBrandFonts(`<text font-family="Arial" x="1">`, fonts), ["Arial"]);
    assert.deepEqual(findOffBrandFonts(`style={{ fontFamily: "Papyrus" }}`, fonts), ["Papyrus"]);
  });
});

describe("content rules: images", () => {
  it("detects generator metadata", () => {
    const png = Buffer.from(
      "\x89PNG....tEXtparameters\0a cat, Steps: 20, Sampler: Euler",
      "latin1",
    );
    assert.deepEqual(findAiImageMarkers(png), ["Stable Diffusion parameters"]);
    const c2pa = Buffer.from(
      "jumbc2pa...http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
    );
    assert.deepEqual(findAiImageMarkers(c2pa), ["trainedAlgorithmicMedia"]);
    assert.deepEqual(findAiImageMarkers(Buffer.from("\x89PNG plain screenshot")), []);
  });
});

describe("content rules: PR declarations", () => {
  it("fails on the unchecked template and passes once every box is checked", () => {
    assert.equal(missingDeclarations(template).length, 3);
    assert.deepEqual(missingDeclarations(template.replace(/- \[ \]/g, "- [x]")), []);
    assert.equal(missingDeclarations(undefined).length, 3);
  });
});
