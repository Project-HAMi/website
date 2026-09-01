import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSiteData } from "./siteDataValidation.js";

const localized = { en: "English", zh: "中文" };
const validData = {
  events: [
    {
      slug: "event-one",
      title: localized,
      date: "2026-09-01",
      location: localized,
      description: localized,
      eventStatus: "EventScheduled",
      banner: "/img/event.png",
      resources: { slides: { ...localized, url: "/resources/slides.pdf" } },
    },
  ],
  caseStudies: [
    {
      name: "Example",
      nameZh: "示例",
      logo: "/img/example.png",
      publishedAt: "2026-09-01",
      metric: localized,
      summary: localized,
      highlights: [localized],
      url: "https://example.com/case-study",
    },
  ],
  adopters: [{ name: "Example", nameZh: "示例", logo: "/img/example.png" }],
  ecosystem: [{ name: "Example", nameZh: "示例", logo: "/img/example.png" }],
  heroStats: [{ key: "release", label: localized, value: "v2.10.0" }],
  valueCards: [{ id: "card", icon: "icon", title: localized, description: localized }],
  vendorDevices: [
    {
      key: "vendor",
      name: "Vendor",
      label: localized,
      logo: "img/example.png",
      href: "https://example.com",
    },
  ],
};

function validate(data, assetExists = () => true) {
  return validateSiteData(data, { assetExists });
}

test("validates complete site-owned data", () => {
  assert.deepEqual(validate(validData), []);
});

test("reports duplicate event slugs", () => {
  const data = structuredClone(validData);
  data.events.push({ ...data.events[0] });

  assert.deepEqual(validate(data), ["events[1].slug duplicates event slug: event-one"]);
});

test("reports invalid event dates", () => {
  const data = structuredClone(validData);
  data.events[0].date = "2026-02-30";

  assert.deepEqual(validate(data), ["events[0].date must be a valid ISO date"]);
});

test("reports missing localized values", () => {
  const data = structuredClone(validData);
  data.events[0].description = { ...localized };
  delete data.events[0].description.zh;

  assert.deepEqual(validate(data), ["events[0].description.zh must be a non-empty string"]);
});

test("reports missing local static assets", () => {
  assert.deepEqual(
    validate(validData, () => false),
    [
      "events[0].banner references missing static asset: /img/event.png",
      "events[0].resources.slides.url references missing static asset: /resources/slides.pdf",
      "caseStudies[0].logo references missing static asset: /img/example.png",
      "adopters[0].logo references missing static asset: /img/example.png",
      "ecosystem[0].logo references missing static asset: /img/example.png",
      "vendorDevices[0].logo references missing static asset: img/example.png",
    ],
  );
});
