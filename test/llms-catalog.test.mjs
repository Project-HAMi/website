import assert from "node:assert/strict";
import { statSync } from "node:fs";
import test from "node:test";
import siteConfig from "../docusaurus.config.js";

test("every curated llms.txt document exists in an indexed section", () => {
  const [, { docsDir, includeOrder }] = siteConfig().plugins.find(
    (entry) => Array.isArray(entry) && entry[0] === "docusaurus-plugin-llms",
  );
  for (const file of includeOrder) {
    assert.ok(
      docsDir.some(({ path }) => file.startsWith(`${path}/`)),
      `Outside llms.txt sections: ${file}`,
    );
    const source = new URL(`../${file}`, import.meta.url);
    assert.ok(
      statSync(source, { throwIfNoEntry: false })?.isFile(),
      `Missing llms.txt document: ${file}`,
    );
  }
});
