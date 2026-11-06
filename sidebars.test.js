const { test } = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const sidebars = require("./sidebars.js");

test("vendor guides group device pages in the main sidebar", () => {
  const vendorGuides = sidebars.docs.find(
    (item) => item.type === "category" && item.label === "Vendor guides",
  );
  assert.ok(vendorGuides);
  assert.ok(vendorGuides.items.includes("userguide/device-supported"));

  const vendors = vendorGuides.items.filter(
    (item) => item.type === "category" && item.key?.startsWith("vendor-"),
  );
  assert.ok(vendors.length > 0);
  assert.equal(new Set(vendors.map((vendor) => vendor.key)).size, vendors.length);
  assert.ok(
    sidebars.docs.every((item) => item.type !== "category" || !item.key?.startsWith("vendor-")),
  );

  const nvidia = vendors.find((vendor) => vendor.key === "vendor-nvidia");
  const metax = vendors.find((vendor) => vendor.key === "vendor-metax");
  assert.ok(nvidia);
  assert.ok(metax);
  assert.ok(nvidia.items.includes("userguide/nvidia-device/remote-gpu"));
  assert.ok(nvidia.items.includes("userguide/nvidia-device/numa-alignment"));
  assert.ok(metax.items.some((category) => category.key === "metax-gpu"));
  assert.ok(metax.items.some((category) => category.key === "metax-sgpu"));
});

test("device matrix links point to vendor guides in both locales", () => {
  const vendorGuides = sidebars.docs.find(
    (item) => item.type === "category" && item.label === "Vendor guides",
  );
  assert.ok(vendorGuides);

  function collectDocIds(item) {
    if (typeof item === "string") {
      return [item];
    }
    return item.type === "category" ? item.items.flatMap(collectDocIds) : [];
  }
  const sidebarDocs = new Set(vendorGuides.items.flatMap(collectDocIds));

  for (const file of [
    "docs/userguide/device-supported.md",
    "i18n/zh/docusaurus-plugin-content-docs/current/userguide/device-supported.md",
  ]) {
    const content = readFileSync(path.resolve(__dirname, file), "utf8");
    const links = [...content.matchAll(/^\|\s*\[[^\]]+\]\(([^)]+)\)\s*\|/gm)];
    assert.ok(links.length > 0, `${file}: no device links found`);
    for (const [, href] of links) {
      if (href.startsWith("https://")) {
        continue;
      }
      const [target] = href.split("#");
      assert.ok(target.endsWith(".md"), `${file}: invalid guide link ${href}`);
      assert.ok(
        sidebarDocs.has(`userguide/${target.slice(0, -3)}`),
        `${file}: ${href} is not in the sidebar`,
      );
      assert.ok(
        existsSync(path.resolve(__dirname, path.dirname(file), target)),
        `${file}: missing ${href}`,
      );
    }
  }
});
