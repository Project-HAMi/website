import { test } from "node:test";
import assert from "node:assert/strict";
import { toAbsoluteSiteUrl } from "./url.js";

const SITE = "https://project-hami.io";

test("toAbsoluteSiteUrl joins a site-relative permalink to the site origin", () => {
  assert.equal(
    toAbsoluteSiteUrl(SITE, "/blog/hami-at-kubecon-china-2026"),
    "https://project-hami.io/blog/hami-at-kubecon-china-2026",
  );
});

test("toAbsoluteSiteUrl keeps an already-localized permalink", () => {
  assert.equal(
    toAbsoluteSiteUrl(SITE, "/zh/blog/hami-at-kubecon-china-2026"),
    "https://project-hami.io/zh/blog/hami-at-kubecon-china-2026",
  );
});

test("toAbsoluteSiteUrl ignores a trailing slash on the site origin", () => {
  assert.equal(toAbsoluteSiteUrl(`${SITE}/`, "/blog/foo"), "https://project-hami.io/blog/foo");
});

test("toAbsoluteSiteUrl leaves an already-absolute URL unchanged", () => {
  assert.equal(
    toAbsoluteSiteUrl(SITE, "https://example.com/already-absolute"),
    "https://example.com/already-absolute",
  );
});

test("toAbsoluteSiteUrl prefixes a path that is missing a leading slash", () => {
  assert.equal(toAbsoluteSiteUrl(SITE, "blog/foo"), "https://project-hami.io/blog/foo");
});
