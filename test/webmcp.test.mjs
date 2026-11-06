import assert from "node:assert/strict";
import test from "node:test";
import { onRouteDidUpdate } from "../src/client/webmcp.js";

test("searchDocs opens the docs search for the current page's language", async (t) => {
  const origin = "https://project-hami.io";
  const query = "显存 + GPU & memory";
  const assign = t.mock.fn();
  const tools = new Map();
  const location = { origin, assign };
  const navigator = { modelContext: { registerTool: (tool) => tools.set(tool.name, tool) } };

  for (const [name, value] of Object.entries({ navigator, window: { location } })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    });
  }

  for (const [page, searchPath] of [
    ["/docs/faq", "/search"],
    ["/zh/docs/faq", "/zh/search"],
  ]) {
    location.pathname = page;
    onRouteDidUpdate();
    const result = await tools.get("hami.searchDocs").execute({ query });
    const destination = new URL(assign.mock.calls.at(-1).arguments[0]);
    assert.equal(result.url, destination.href);
    assert.equal(destination.origin, origin);
    assert.equal(destination.pathname, searchPath);
    assert.equal(destination.searchParams.get("q"), query);
    assert.equal(destination.searchParams.get("ctx"), "docs");
  }
});
