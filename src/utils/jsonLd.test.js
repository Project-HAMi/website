import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSiteJsonLd,
  buildTechArticleJsonLd,
  buildWebPageJsonLd,
  serializeJsonLd,
} from "./jsonLd.js";

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
  assert.equal(
    schema["@graph"][0].description,
    "Heterogeneous AI Computing Virtualization Middleware",
  );
  assert.deepEqual(schema["@graph"][0].alternateName, [
    "Heterogeneous AI Computing Virtualization Middleware",
    "k8s-vGPU-scheduler",
  ]);
  assert.equal(schema["@graph"][0].parentOrganization.name, "LF Projects, LLC");
  assert.equal(schema["@graph"][0].memberOf.url, "https://www.cncf.io/");
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
  assert.equal(schema["@id"], `${schema.url}#article`);
  assert.equal(schema.mainEntityOfPage["@id"], schema.url);
  assert.equal(schema.image, `${siteUrl}/img/hami-graph-color.png`);
  assert.equal("datePublished" in schema, false);
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
  assert.equal(schema.image, `${siteUrl}/img/hami-graph-color.png`);
  assert.equal("description" in schema, false);
  assert.equal("datePublished" in schema, false);
  assert.equal("dateModified" in schema, false);
  assert.equal("version" in schema, false);
});

test("TechArticle uses a site-root image and does not require locale or permalink", () => {
  const withDefaultImage = buildTechArticleJsonLd({
    siteUrl,
    title: "Architecture",
    permalink: "/zh/docs/core-concepts/architecture",
    locale: "zh-Hans",
  });
  const withoutPermalink = buildTechArticleJsonLd({
    siteUrl,
    title: "Architecture",
  });

  assert.equal(withDefaultImage.inLanguage, "zh-CN");
  assert.equal(withDefaultImage.image, `${siteUrl}/img/hami-graph-color.png`);
  assert.equal("url" in withoutPermalink, false);
  assert.equal("mainEntityOfPage" in withoutPermalink, false);
  assert.equal(withoutPermalink.inLanguage, "en");
});

test("JSON-LD serialization prevents script-tag breakout", () => {
  const serialized = serializeJsonLd({ title: "</script><script>alert(1)</script>" });

  assert.equal(serialized.includes("</script>"), false);
  assert.equal(serialized.includes("\\u003c/script>"), true);
});

test("AboutPage schema points at the site Organization without copying legal text", () => {
  const schema = buildWebPageJsonLd({
    siteUrl,
    type: "AboutPage",
    name: "About HAMi",
    description: "Learn about the HAMi open-source project.",
    permalink: "/about",
    locale: "en",
  });

  assert.equal(schema["@type"], "AboutPage");
  assert.equal(schema.url, `${siteUrl}/about`);
  assert.equal(schema.about["@id"], `${siteUrl}/#organization`);
  assert.equal(schema.isPartOf["@id"], `${siteUrl}/#website`);
});
