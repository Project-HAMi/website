import assert from "node:assert/strict";
import test from "node:test";
import { load } from "js-yaml";
import { generatePodManifest } from "./manifest.js";

const defaultLimits = [
  ["NVIDIA", { "nvidia.com/gpu": 1, "nvidia.com/gpumem": 3000 }],
  ["AMD", { "amd.com/gpu": 1, "amd.com/gpumem": 3000 }],
  ["BIREN", { "birentech.com/gpu": 1 }],
  ["CAMBRICON", { "cambricon.com/vmlu": 1, "cambricon.com/mlu.smlu.vmemory": 8 }],
  ["HYGON", { "hygon.com/dcunum": 1, "hygon.com/dcumem": 3000 }],
  ["ILUVATAR_BI_V150", { "iluvatar.ai/BI-V150-vgpu": 1, "iluvatar.ai/BI-V150.vMem": 8 }],
  ["ILUVATAR_MR_V100", { "iluvatar.ai/MR-V100-vgpu": 1, "iluvatar.ai/MR-V100.vMem": 8 }],
  ["ILUVATAR_MR_V50", { "iluvatar.ai/MR-V50-vgpu": 1, "iluvatar.ai/MR-V50.vMem": 8 }],
  ["ILUVATAR_BI_V100", { "iluvatar.ai/BI-V100-vgpu": 1, "iluvatar.ai/BI-V100.vMem": 8 }],
  ["MTHREADS", { "mthreads.com/vgpu": 1, "mthreads.com/sgpu-memory": 8 }],
  ["METAX_GPU", { "metax-tech.com/gpu": 1 }],
  ["METAX_SGPU", { "metax-tech.com/sgpu": 1, "metax-tech.com/vmemory": 4 }],
  ["ENFLAME", { "enflame.com/drs-gcu": 1 }],
  ["AWSNEURON", { "aws.amazon.com/neuroncore": 1 }],
  ["KUNLUNXIN", { "kunlunxin.com/xpu": 1 }],
  ["ASCEND_910A", { "huawei.com/Ascend910A": 1, "huawei.com/Ascend910A-memory": 3000 }],
  ["ASCEND_910B2", { "huawei.com/Ascend910B2": 1, "huawei.com/Ascend910B2-memory": 3000 }],
  ["ASCEND_910B3", { "huawei.com/Ascend910B3": 1, "huawei.com/Ascend910B3-memory": 3000 }],
  ["ASCEND_910B4", { "huawei.com/Ascend910B4": 1, "huawei.com/Ascend910B4-memory": 3000 }],
  ["ASCEND_910B4_1", { "huawei.com/Ascend910B4-1": 1, "huawei.com/Ascend910B4-1-memory": 3000 }],
  ["ASCEND_910C", { "huawei.com/Ascend910C": 1, "huawei.com/Ascend910C-memory": 3000 }],
  ["ASCEND_310P", { "huawei.com/Ascend310P": 1, "huawei.com/Ascend310P-memory": 3000 }],
];

for (const [vendor, limits] of defaultLimits) {
  test(`${vendor} default form values generate nested resource limits`, () => {
    const yaml = generatePodManifest(vendor);
    const pod = load(yaml);
    const container = pod.spec.containers[0];
    assert.deepEqual(container.resources, { limits });
    for (const key of Object.keys(limits)) assert.equal(Object.hasOwn(container, key), false);
    assert.equal(pod.metadata.name, `hami-${vendor.toLowerCase().replace(/_/g, "-")}-pod`);
    assert.equal(pod.metadata.annotations, undefined);
    assert.equal(pod.spec.runtimeClassName, undefined);
    if (vendor.startsWith("ASCEND_")) assert.match(yaml, /# runtimeClassName: ascend/);
  });
}

for (const [vendor, options, limits] of [
  [
    "NVIDIA",
    { deviceCount: 2, memValue: 4096, coreMode: "value", coreValue: 75 },
    { "nvidia.com/gpu": 2, "nvidia.com/gpumem": 4096, "nvidia.com/gpucores": 75 },
  ],
  [
    "AMD",
    { deviceCount: 2, memValue: 2048, coreMode: "value", coreValue: 25 },
    { "amd.com/gpu": 2, "amd.com/gpumem": 2048, "amd.com/gpucores": 25 },
  ],
  [
    "NVIDIA",
    { memMode: "percentage", memValue: 40, coreMode: "none", coreValue: 75 },
    { "nvidia.com/gpu": 1, "nvidia.com/gpumem-percentage": 40 },
  ],
  [
    "CAMBRICON",
    { memValue: 16, coreMode: "percentage", coreValue: 30 },
    {
      "cambricon.com/vmlu": 1,
      "cambricon.com/mlu.smlu.vmemory": 16,
      "cambricon.com/mlu.smlu.vcore": 30,
    },
  ],
  [
    "HYGON",
    { memValue: 4096, coreMode: "value", coreValue: 50 },
    { "hygon.com/dcunum": 1, "hygon.com/dcumem": 4096, "hygon.com/dcucores": 50 },
  ],
  [
    "ILUVATAR_BI_V150",
    { memValue: 16, coreMode: "value", coreValue: 50 },
    {
      "iluvatar.ai/BI-V150-vgpu": 1,
      "iluvatar.ai/BI-V150.vMem": 16,
      "iluvatar.ai/BI-V150.vCore": 50,
    },
  ],
]) {
  test(`${vendor} ${options.memMode || "value"} memory and ${options.coreMode} cores generate their configured limits`, () => {
    const pod = load(generatePodManifest(vendor, options));
    assert.deepEqual(pod.spec.containers[0].resources, { limits });
  });
}

for (const [vendor, limits] of defaultLimits.filter(
  ([vendor]) =>
    vendor === "HYGON" || vendor.startsWith("ILUVATAR_") || vendor.startsWith("ASCEND_"),
)) {
  test(`${vendor} multi-device requests omit per-device memory and core limits`, () => {
    const pod = load(
      generatePodManifest(vendor, {
        deviceCount: 2,
        memValue: 4096,
        coreMode: "value",
        coreValue: 50,
      }),
    );
    const resourceKey = Object.keys(limits)[0];
    assert.deepEqual(pod.spec.containers[0].resources, { limits: { [resourceKey]: 2 } });
  });
}

test("advanced device annotations are generated under metadata with escaped values", () => {
  const deviceType = 'NVIDIA "A100": 80GB';
  const deviceUuid = 'GPU-"example"\\node';
  const pod = load(generatePodManifest("NVIDIA", { advanced: true, deviceType, deviceUuid }));
  assert.deepEqual(pod.metadata.annotations, {
    "nvidia.com/use-gputype": deviceType,
    "nvidia.com/use-gpuuuid": deviceUuid,
  });
  assert.deepEqual(pod.spec.containers[0].resources.limits, {
    "nvidia.com/gpu": 1,
    "nvidia.com/gpumem": 3000,
  });
});

test("advanced fields do not emit annotations when the panel is disabled", () => {
  const pod = load(
    generatePodManifest("NVIDIA", {
      advanced: false,
      deviceType: "A100",
      deviceUuid: "GPU-example",
    }),
  );
  assert.equal(pod.metadata.annotations, undefined);
});

test("empty advanced fields omit the annotations mapping", () => {
  const pod = load(generatePodManifest("NVIDIA", { advanced: true }));
  assert.equal(pod.metadata.annotations, undefined);
});

test("vendors without a type annotation only emit their supported UUID annotation", () => {
  const pod = load(
    generatePodManifest("ENFLAME", {
      advanced: true,
      deviceType: "ignored",
      deviceUuid: "GCU-example",
    }),
  );
  assert.deepEqual(pod.metadata.annotations, { "enflame.com/use-gpuuuid": "GCU-example" });
  assert.deepEqual(pod.spec.containers[0].resources.limits, { "enflame.com/drs-gcu": 1 });
});
