const { test } = require("node:test");
const assert = require("node:assert/strict");
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
