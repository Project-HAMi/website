import assert from "node:assert/strict";
import test from "node:test";
import { load } from "js-yaml";
import { formatPodManifest } from "./manifest.js";

for (const [vendor, limits] of [
  ["NVIDIA", { "nvidia.com/gpu": 2, "nvidia.com/gpumem": 3000, "nvidia.com/gpucores": 50 }],
  ["AMD", { "amd.com/gpu": 1, "amd.com/gpumem-percentage": 25, "amd.com/gpucores": 50 }],
  ["ASCEND_910B2", { "huawei.com/Ascend910B2": 2 }],
]) {
  test(`${vendor} resource limits belong to the container resources`, () => {
    const yaml = formatPodManifest(
      vendor,
      [],
      Object.entries(limits).map(([key, value]) => `${key}: ${value}`),
    );
    const pod = load(yaml);
    const container = pod.spec.containers[0];
    assert.deepEqual(container.resources, { limits });
    for (const key of Object.keys(limits)) assert.equal(Object.hasOwn(container, key), false);
    assert.equal(pod.spec.runtimeClassName, undefined);
  });
}

test("device annotations stay under metadata", () => {
  const annotations = ['    nvidia.com/use-gpuuuid: "GPU-example"'];
  const pod = load(formatPodManifest("NVIDIA", annotations, ["nvidia.com/gpu: 1"]));
  assert.deepEqual(pod.metadata.annotations, { "nvidia.com/use-gpuuuid": "GPU-example" });
});
