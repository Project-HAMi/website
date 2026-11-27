import assert from "node:assert/strict";
import test from "node:test";
import { load } from "js-yaml";
import { generatePodManifest } from "./manifest.js";
import { clampCoreValue, switchManifestVendor } from "./manifest-vendor-state.js";

test("NVIDIA percentage memory does not leave Biren's zero value on a round trip", () => {
  const original = {
    vendor: "NVIDIA",
    memMode: "percentage",
    memValue: 40,
    coreMode: "value",
    coreValue: 75,
    deviceType: "A100",
    deviceUuid: "GPU-1",
  };
  const biren = switchManifestVendor(original, "BIREN");
  const nvidia = switchManifestVendor(biren, "NVIDIA");

  assert.equal(biren.memValue, 0);
  assert.deepEqual(nvidia, {
    vendor: "NVIDIA",
    memMode: "value",
    memValue: 3000,
    coreMode: "none",
    coreValue: 50,
    deviceType: "",
    deviceUuid: "",
  });
  const pod = load(generatePodManifest(nvidia.vendor, nvidia));
  assert.deepEqual(pod.spec.containers[0].resources.limits, {
    "nvidia.com/gpu": 1,
    "nvidia.com/gpumem": 3000,
  });
});

test("switching away from Cambricon percentage cores clears the unsupported mode", () => {
  const cambricon = {
    vendor: "CAMBRICON",
    memMode: "value",
    memValue: 16,
    coreMode: "percentage",
    coreValue: 30,
    deviceType: "MLU",
    deviceUuid: "MLU-1",
  };
  const nvidia = switchManifestVendor(cambricon, "NVIDIA");
  const mthreads = switchManifestVendor(nvidia, "MTHREADS");

  assert.equal(nvidia.memValue, 3000);
  assert.equal(nvidia.coreMode, "none");
  assert.equal(nvidia.coreValue, 50);
  assert.equal(mthreads.coreMode, "none");
  assert.equal(mthreads.coreValue, 8);
  assert.equal(mthreads.memValue, 8);
  assert.equal(mthreads.deviceType, "");
  assert.equal(mthreads.deviceUuid, "");
});

test("switching between vendors with core inputs still resets the old request", () => {
  const nvidia = {
    vendor: "NVIDIA",
    memMode: "value",
    memValue: 4096,
    coreMode: "value",
    coreValue: 75,
    deviceType: "A100",
    deviceUuid: "GPU-1",
  };
  const amd = switchManifestVendor(nvidia, "AMD");

  assert.equal(amd.memValue, 3000);
  assert.equal(amd.coreMode, "none");
  assert.equal(amd.coreValue, 50);
  const pod = load(generatePodManifest(amd.vendor, amd));
  assert.deepEqual(pod.spec.containers[0].resources.limits, {
    "amd.com/gpu": 1,
    "amd.com/gpumem": 3000,
  });
});

test("Moore Threads core input stops at 16 while NVIDIA still allows 100", () => {
  assert.equal(clampCoreValue("MTHREADS", "100"), 16);
  assert.equal(clampCoreValue("MTHREADS", "8"), 8);
  assert.equal(clampCoreValue("NVIDIA", "100"), 100);

  const mthreads = switchManifestVendor({ vendor: "NVIDIA" }, "MTHREADS");
  const pod = load(
    generatePodManifest(mthreads.vendor, {
      ...mthreads,
      coreMode: "value",
      coreValue: clampCoreValue(mthreads.vendor, "100"),
    }),
  );
  assert.equal(pod.spec.containers[0].resources.limits["mthreads.com/sgpu-core"], 16);
});
