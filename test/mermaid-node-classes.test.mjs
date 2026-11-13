/**
 * Guards the mermaid node-colour classes used in Markdown.
 *
 * Node colours live in `src/css/custom.css` as a small set of role classes
 * (accent, info, run, ok, bad) so the diagrams follow the light/dark colour
 * mode instead of hardcoding fills. Mermaid does not warn when a diagram
 * references a class nobody defined -- `class FOO nope` renders silently with
 * the default theme fill, so a typo is invisible until someone looks at the
 * page in both colour modes.
 *
 * This walks every mermaid block in the content tree and fails on a class that
 * is neither defined in the stylesheet nor by a `classDef` inside the same
 * diagram. The allowed set is parsed out of custom.css rather than repeated
 * here, so adding a role to the stylesheet is all it takes to use it.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

/** Content roots that ship mermaid diagrams. `versioned_docs` is frozen, so it is left alone. */
const CONTENT_ROOTS = ["blog", "docs", "tutorials", "i18n"];

/** Classes mermaid resolves itself; a diagram may reference them without defining anything. */
const BUILTIN_CLASSES = new Set(["default"]);

/** Role classes defined in the stylesheet, i.e. the ones that actually carry a colour. */
function roleClassesFromStylesheet() {
  const css = readFileSync(join(repoRoot, "src/css/custom.css"), "utf8");
  const classes = new Set();
  // .docusaurus-mermaid-container .ok { --hami-mermaid-node-fill: ...
  const rule = /\.docusaurus-mermaid-container\s+\.([\w-]+)\s*\{([^}]*)\}/g;
  for (const [, name, body] of css.matchAll(rule)) {
    if (body.includes("--hami-mermaid-node-fill")) classes.add(name);
  }
  return classes;
}

function markdownFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") markdownFiles(full, found);
    } else if (/\.mdx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

/** Every `class X,Y role` / `X:::role` reference in the mermaid blocks of one file. */
function classReferences(file) {
  const text = readFileSync(file, "utf8");
  const references = [];
  for (const block of text.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    const body = block[1];
    const lineOffset = text.slice(0, block.index).split("\n").length;
    const locally = new Set(
      [...body.matchAll(/^\s*classDef\s+([\w-]+)/gm)].map(([, name]) => name),
    );
    const record = (name, index) => {
      if (locally.has(name)) return;
      references.push({
        name,
        line: lineOffset + body.slice(0, index).split("\n").length,
      });
    };
    for (const match of body.matchAll(/^[ \t]*class\s+([\w,\s]+?)\s+([\w-]+)\s*$/gm)) {
      record(match[2], match.index);
    }
    for (const match of body.matchAll(/[\w-]+:::([\w-]+)/g)) {
      record(match[1], match.index);
    }
  }
  return references;
}

describe("mermaid node classes", () => {
  const roleClasses = roleClassesFromStylesheet();

  it("defines the role classes in custom.css", () => {
    assert.ok(roleClasses.size > 0, "no --hami-mermaid-node-fill rules found in custom.css");
  });

  it("only references classes that carry a colour", () => {
    const known = new Set([...roleClasses, ...BUILTIN_CLASSES]);
    const unknown = [];

    for (const root of CONTENT_ROOTS) {
      for (const file of markdownFiles(join(repoRoot, root))) {
        for (const { name, line } of classReferences(file)) {
          if (!known.has(name)) {
            unknown.push(`${relative(repoRoot, file)}:${line} -> "${name}"`);
          }
        }
      }
    }

    assert.deepEqual(
      unknown,
      [],
      `mermaid diagrams reference classes that are not defined in src/css/custom.css ` +
        `(these nodes render with the default theme fill):\n  ${unknown.join("\n  ")}\n` +
        `Known classes: ${[...known].sort().join(", ")}`,
    );
  });
});
