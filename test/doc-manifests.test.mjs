/**
 * Validates the Kubernetes manifest examples embedded in the documentation.
 *
 * Many pages show YAML the reader is expected to copy and apply. A block is
 * treated as a manifest only when it declares both `apiVersion` and `kind`;
 * bare snippets (a lone `resources:` block) and annotated example lists (which
 * deliberately repeat keys to contrast valid and invalid requests) are not full
 * manifests and are skipped. Every manifest that remains must parse as YAML, so
 * a broken example can't ship.
 *
 * Versioned snapshots under versioned_docs/ are frozen and excluded, matching
 * the lint:md scope.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { loadAll } from "js-yaml";

const roots = ["docs", "tutorials", "i18n/zh/docusaurus-plugin-content-docs/current"];

function markdownFiles(dir, out = []) {
  // withFileTypes avoids following symlinks into directories.
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(p, out);
    else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")))
      out.push(p);
  }
  return out;
}

function manifestBlocks(markdown) {
  const blocks = [];
  const fence = /```ya?ml\n([\s\S]*?)```/g;
  let match;
  while ((match = fence.exec(markdown))) {
    const body = match[1];
    if (/^\s*apiVersion:/m.test(body) && /^\s*kind:/m.test(body)) {
      blocks.push(body);
    }
  }
  return blocks;
}

describe("documentation manifest examples", () => {
  it("parse as valid YAML", () => {
    const failures = [];
    for (const root of roots) {
      for (const file of markdownFiles(root)) {
        manifestBlocks(readFileSync(file, "utf8")).forEach((body, i) => {
          try {
            loadAll(body);
          } catch (err) {
            failures.push(`${file} (manifest #${i + 1}): ${err.reason || err.message}`);
          }
        });
      }
    }
    assert.deepEqual(failures, [], `\n${failures.join("\n")}`);
  });
});
