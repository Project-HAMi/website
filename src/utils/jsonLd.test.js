import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSiteJsonLd, buildTechArticleJsonLd, serializeJsonLd } from "./jsonLd.js";

const siteUrl = "https://project-hami.io";

test("site schema connects the Organization and WebSite without SearchAction", () => {
  const schema = buildSiteJsonLd({
    siteUrl: `${siteUrl}/`,
    name: "HAMi",
    description: "Heterogeneous AI Computing Virtualization Middleware",
    logoPath: "/img/hami-graph-color.png",
  });

  assert.equal(schema["@graph"][0]["@id"], `${siteUrl}/#organization`);
  assert.equal(schema["@graph"][0].logo.url, `${siteUrl}/img/hami-graph-color.png`);
  assert.deepEqual(schema["@graph"][1].publisher, {
    "@id": `${siteUrl}/#organization`,
  });
  assert.equal(JSON.stringify(schema).includes("SearchAction"), false);
  assert.equal("potentialAction" in schema["@graph"][1], false);
});

test("TechArticle uses canonical metadata and a millisecond modification date", () => {
  const schema = buildTechArticleJsonLd({
    siteUrl,
    title: "Architecture",
    description: "How HAMi schedules and controls accelerator workloads.",
    permalink: "/docs/core-concepts/architecture",
    image: "/img/hami-graph-color.png",
    locale: "en",
    lastUpdatedAt: Date.UTC(2026, 6, 29, 12, 0, 0),
    version: "v2.9.0",
  });

  assert.equal(schema.url, `${siteUrl}/docs/core-concepts/architecture`);
  assert.equal(schema.mainEntityOfPage["@id"], schema.url);
  assert.equal(schema.image, `${siteUrl}/img/hami-graph-color.png`);
  assert.equal(schema.dateModified, "2026-07-29T12:00:00.000Z");
  assert.equal(schema.author.name, "HAMi");
  assert.equal(schema.publisher["@id"], `${siteUrl}/#organization`);
  assert.equal(schema.publisher.logo.url, `${siteUrl}/img/hami-graph-color.png`);
  assert.equal(schema.version, "v2.9.0");
});

test("TechArticle localizes Chinese and omits unavailable optional metadata", () => {
  const schema = buildTechArticleJsonLd({
    siteUrl,
    title: "教程",
    permalink: "/zh/tutorials/",
    locale: "zh",
  });

  assert.equal(schema.inLanguage, "zh-CN");
  assert.equal(schema.url, `${siteUrl}/zh/tutorials`);
  assert.equal("description" in schema, false);
  assert.equal("image" in schema, false);
  assert.equal("dateModified" in schema, false);
  assert.equal("version" in schema, false);
});

test("JSON-LD serialization prevents script-tag breakout", () => {
  const serialized = serializeJsonLd({ title: "</script><script>alert(1)</script>" });

  assert.equal(serialized.includes("</script>"), false);
  assert.equal(serialized.includes("\\u003c/script>"), true);
});
