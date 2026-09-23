import React, { useState, useMemo } from "react";
import CodeBlock from "@theme/CodeBlock";
import Translate, { translate } from "@docusaurus/Translate";
import clsx from "clsx";
import styles from "./styles.module.css";

const VENDORS = {
  NVIDIA: {
    name: "NVIDIA (GPU)",
    resourceKey: "nvidia.com/gpu",
    memKey: "nvidia.com/gpumem",
    memPctKey: "nvidia.com/gpumem-percentage",
    coreKey: "nvidia.com/gpucores",
    corePctKey: null,
    typeKey: "nvidia.com/use-gputype",
    uuidKey: "nvidia.com/use-gpuuuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  AMD: {
    name: "AMD (GPU)",
    resourceKey: "amd.com/gpu",
    memKey: "amd.com/gpumem",
    memPctKey: null,
    coreKey: "amd.com/gpucores",
    corePctKey: null,
    typeKey: "amd.com/use-gputype",
    uuidKey: "amd.com/use-gpu-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  BIREN: {
    name: "Birentech (GPU)",
    resourceKey: "birentech.com/gpu",
    memKey: null,
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "birentech.com/use-gpuuuid",
    memUnit: "MiB",
    defaultMem: 0,
  },
  CAMBRICON: {
    name: "Cambricon (MLU)",
    resourceKey: "cambricon.com/vmlu",
    memKey: "cambricon.com/mlu.smlu.vmemory",
    memPctKey: null,
    coreKey: "cambricon.com/mlu.smlu.vcore",
    corePctKey: "cambricon.com/mlu.smlu.vcore",
    typeKey: "cambricon.com/use-mlutype",
    uuidKey: "cambricon.com/use-gpuuuid",
    memUnit: "256 MB units",
    defaultMem: 8,
  },
  HYGON: {
    name: "Hygon (DCU)",
    resourceKey: "hygon.com/dcunum",
    memKey: "hygon.com/dcumem",
    memPctKey: null,
    coreKey: "hygon.com/dcucores",
    corePctKey: null,
    typeKey: "hygon.com/use-dcutype",
    uuidKey: "hygon.com/use-gpuuuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  ILUVATAR_BI_V150: {
    name: "Iluvatar BI-V150 (GPU)",
    resourceKey: "iluvatar.ai/BI-V150-vgpu",
    memKey: "iluvatar.ai/BI-V150.vMem",
    memPctKey: null,
    coreKey: "iluvatar.ai/BI-V150.vCore",
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-BI-V150-uuid",
    memUnit: "256 MB units",
    defaultMem: 8,
  },
  ILUVATAR_MR_V100: {
    name: "Iluvatar MR-V100 (GPU)",
    resourceKey: "iluvatar.ai/MR-V100-vgpu",
    memKey: "iluvatar.ai/MR-V100.vMem",
    memPctKey: null,
    coreKey: "iluvatar.ai/MR-V100.vCore",
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-MR-V100-uuid",
    memUnit: "256 MB units",
    defaultMem: 8,
  },
  ILUVATAR_MR_V50: {
    name: "Iluvatar MR-V50 (GPU)",
    resourceKey: "iluvatar.ai/MR-V50-vgpu",
    memKey: "iluvatar.ai/MR-V50.vMem",
    memPctKey: null,
    coreKey: "iluvatar.ai/MR-V50.vCore",
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-MR-V50-uuid",
    memUnit: "256 MB units",
    defaultMem: 8,
  },
  ILUVATAR_BI_V100: {
    name: "Iluvatar BI-V100 (GPU)",
    resourceKey: "iluvatar.ai/BI-V100-vgpu",
    memKey: "iluvatar.ai/BI-V100.vMem",
    memPctKey: null,
    coreKey: "iluvatar.ai/BI-V100.vCore",
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-BI-V100-uuid",
    memUnit: "256 MB units",
    defaultMem: 8,
  },
  MTHREADS: {
    name: "Moore Threads (GPU)",
    resourceKey: "mthreads.com/vgpu",
    memKey: "mthreads.com/sgpu-memory",
    memPctKey: null,
    coreKey: "mthreads.com/sgpu-core",
    corePctKey: null,
    typeKey: null,
    uuidKey: "mthreads.ai/use-gpuuuid",
    memUnit: "512 MiB units",
    defaultMem: 8,
  },
  METAX_GPU: {
    name: "MetaX GPU (topology-aware)",
    resourceKey: "metax-tech.com/gpu",
    memKey: null,
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "metax-tech.com/use-gpuuuid",
    memUnit: "MiB",
    defaultMem: 4096,
  },
  METAX_SGPU: {
    name: "MetaX sGPU (shared)",
    resourceKey: "metax-tech.com/sgpu",
    memKey: "metax-tech.com/vmemory",
    memPctKey: null,
    coreKey: "metax-tech.com/vcore",
    corePctKey: null,
    typeKey: null,
    uuidKey: "metax-tech.com/use-gpuuuid",
    memUnit: "GiB",
    defaultMem: 4,
  },
  ENFLAME: {
    name: "Enflame (GCU, DRS slices)",
    resourceKey: "enflame.com/drs-gcu",
    memKey: null,
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "enflame.com/use-gpuuuid",
    memUnit: "MiB",
    defaultMem: 4096,
  },
  AWSNEURON: {
    name: "AWS Neuron (Inferentia/Trainium)",
    resourceKey: "aws.amazon.com/neuroncore",
    memKey: null,
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "aws.amazon.com/use-neuron-uuid",
    memUnit: "MiB",
    defaultMem: 0,
  },
  KUNLUNXIN: {
    name: "KunlunXin (XPU)",
    resourceKey: "kunlunxin.com/xpu",
    memKey: null,
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-xpu-uuid",
    memUnit: "MiB",
    defaultMem: 0,
  },
  ASCEND_910A: {
    name: "Huawei Ascend 910A (NPU)",
    resourceKey: "huawei.com/Ascend910A",
    memKey: "huawei.com/Ascend910A-memory",
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-Ascend910A-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },

  ASCEND_910B2: {
    name: "Huawei Ascend 910B2 (NPU)",
    resourceKey: "huawei.com/Ascend910B2",
    memKey: "huawei.com/Ascend910B2-memory",
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-Ascend910B2-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  ASCEND_910B3: {
    name: "Huawei Ascend 910B3 (NPU)",
    resourceKey: "huawei.com/Ascend910B3",
    memKey: "huawei.com/Ascend910B3-memory",
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-Ascend910B3-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  ASCEND_910B4: {
    name: "Huawei Ascend 910B4 (NPU)",
    resourceKey: "huawei.com/Ascend910B4",
    memKey: "huawei.com/Ascend910B4-memory",
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-Ascend910B4-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  ASCEND_910B4_1: {
    name: "Huawei Ascend 910B4-1 (NPU)",
    resourceKey: "huawei.com/Ascend910B4-1",
    memKey: "huawei.com/Ascend910B4-1-memory",
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-Ascend910B4-1-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  ASCEND_910C: {
    name: "Huawei Ascend 910C (NPU)",
    resourceKey: "huawei.com/Ascend910C",
    memKey: "huawei.com/Ascend910C-memory",
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-Ascend910C-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
  ASCEND_310P: {
    name: "Huawei Ascend 310P (NPU)",
    resourceKey: "huawei.com/Ascend310P",
    memKey: "huawei.com/Ascend310P-memory",
    memPctKey: null,
    coreKey: null,
    corePctKey: null,
    typeKey: null,
    uuidKey: "hami.io/use-Ascend310P-uuid",
    memUnit: "MiB",
    defaultMem: 3000,
  },
};

export default function ManifestGenerator() {
  const [vendor, setVendor] = useState("NVIDIA");
  const [deviceCount, setDeviceCount] = useState(1);
  const [memMode, setMemMode] = useState("value");
  const [memValue, setMemValue] = useState(3000);
  const [coreMode, setCoreMode] = useState("none");
  const [coreValue, setCoreValue] = useState(50);

  const [advanced, setAdvanced] = useState(false);
  const [deviceType, setDeviceType] = useState("");
  const [deviceUuid, setDeviceUuid] = useState("");

  // Compute yamlCode synchronously for bulletproof SSR
  const yamlCode = useMemo(() => {
    const v = VENDORS[vendor];
    let annotations = [];
    let limits = [];

    limits.push(`      ${v.resourceKey}: ${deviceCount}`);

    const omitMultiDeviceMem =
      deviceCount > 1 &&
      (vendor === "HYGON" || vendor.startsWith("ILUVATAR_") || vendor.startsWith("ASCEND_"));
    const omitMultiDeviceCore =
      deviceCount > 1 && (vendor === "HYGON" || vendor.startsWith("ILUVATAR_"));

    if (v.memKey && !omitMultiDeviceMem) {
      if (memMode === "value" && v.memUnit !== "%") {
        limits.push(`      ${v.memKey}: ${memValue}`);
      } else if (memMode === "percentage" && v.memPctKey) {
        limits.push(`      ${v.memPctKey}: ${memValue}`);
      } else if (v.memUnit === "%") {
        limits.push(`      ${v.memPctKey || v.memKey}: ${memValue}`);
      }
    }

    if (v.coreKey && coreMode !== "none" && !omitMultiDeviceCore) {
      if (coreMode === "value") {
        limits.push(`      ${v.coreKey}: ${coreValue}`);
      } else if (coreMode === "percentage" && v.corePctKey) {
        limits.push(`      ${v.corePctKey}: ${coreValue}`);
      }
    }

    if (advanced) {
      if (deviceType && v.typeKey) {
        annotations.push(`    ${v.typeKey}: ${JSON.stringify(deviceType)}`);
      }
      if (deviceUuid && v.uuidKey) {
        annotations.push(`    ${v.uuidKey}: ${JSON.stringify(deviceUuid)}`);
      }
    }

    const podName = `hami-${vendor.toLowerCase().replace(/_/g, "-")}-pod`;
    let code = `apiVersion: v1
kind: Pod
metadata:
  name: ${podName}
`;

    if (annotations.length > 0) {
      code += `  annotations:\n${annotations.join("\n")}\n`;
    }

    code += `spec:\n`;
    if (vendor.startsWith("ASCEND_")) {
      // runtimeClassName is off by default and the name is configurable in the Ascend setup.
      // Emit it as a YAML comment so users can enable it if their cluster is configured for it.
      code += `  # runtimeClassName: ascend  # enable if your cluster uses the Ascend runtime class\n`;
    }
    code += `  containers:
    - name: hami-container
      image: ubuntu:22.04
      command: ["sleep", "infinity"]
      resources:
        limits:
${limits.join("\n")}`;

    return code;
  }, [
    vendor,
    deviceCount,
    memMode,
    memValue,
    coreMode,
    coreValue,
    advanced,
    deviceType,
    deviceUuid,
  ]);

  const vInfo = VENDORS[vendor];

  return (
    <div className={styles.generatorContainer}>
      <div className={styles.controlsPanel}>
        <h3>
          <Translate id="manifest.generator.title">Resource Request Configuration</Translate>
        </h3>

        <div className={styles.inputGroup}>
          <label htmlFor="deviceVendor">
            <Translate id="manifest.generator.vendor">Device Vendor</Translate>
          </label>
          <select
            id="deviceVendor"
            value={vendor}
            onChange={(e) => {
              const newVendor = e.target.value;
              setVendor(newVendor);
              setDeviceType("");
              setDeviceUuid("");
              const isPct = VENDORS[newVendor].memUnit === "%";
              setMemMode(isPct ? "percentage" : "value");
              if (VENDORS[newVendor].memUnit !== VENDORS[vendor].memUnit) {
                setMemValue(VENDORS[newVendor].defaultMem);
              } else if (isPct && memValue > 100) {
                setMemValue(100);
              }
              if (!VENDORS[newVendor].coreKey) {
                setCoreMode("none");
              }
            }}
            className={styles.select}
          >
            {Object.entries(VENDORS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="deviceCount">
            <Translate id="manifest.generator.deviceCount">Number of Devices Requested</Translate>
          </label>
          <input
            id="deviceCount"
            type="number"
            min="1"
            value={deviceCount}
            onChange={(e) => setDeviceCount(Math.max(1, parseInt(e.target.value) || 1))}
            className={styles.input}
          />
        </div>

        {vInfo.memKey && (
          <div className={styles.flexRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="memMode">
                <Translate id="manifest.generator.memMode">Memory Allocation Type</Translate>
              </label>
              <select
                id="memMode"
                value={memMode}
                onChange={(e) => {
                  const newMode = e.target.value;
                  setMemMode(newMode);
                  if (newMode === "percentage" && memValue > 100) {
                    setMemValue(100);
                  }
                }}
                className={styles.select}
                disabled={vInfo.memUnit === "%"}
              >
                {vInfo.memUnit !== "%" && (
                  <option value="value">
                    {translate({ id: "manifest.generator.memMode.absolute", message: "Absolute" })}{" "}
                    {`(${vInfo.memUnit})`}
                  </option>
                )}
                {(vInfo.memPctKey || vInfo.memUnit === "%") && (
                  <option value="percentage">
                    {translate({
                      id: "manifest.generator.memMode.percentage",
                      message: "Percentage (%)",
                    })}
                  </option>
                )}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="memValue">
                <Translate id="manifest.generator.memValue">Memory Value</Translate>
              </label>
              <input
                id="memValue"
                type="number"
                min="0"
                value={memValue}
                onChange={(e) => {
                  let val = Math.max(0, parseInt(e.target.value) || 0);
                  if (memMode === "percentage" || vInfo.memUnit === "%") {
                    val = Math.min(val, 100);
                  }
                  setMemValue(val);
                }}
                className={styles.input}
              />
            </div>
          </div>
        )}

        {vInfo.coreKey && (
          <div className={styles.flexRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="coreMode">
                <Translate id="manifest.generator.coreMode">Core Allocation</Translate>
              </label>
              <select
                id="coreMode"
                value={coreMode}
                onChange={(e) => setCoreMode(e.target.value)}
                className={styles.select}
              >
                <option value="none">
                  {translate({ id: "manifest.generator.coreMode.none", message: "None (Default)" })}
                </option>
                <option value="value">
                  {translate({
                    id: "manifest.generator.coreMode.absolute",
                    message: "Absolute Cores",
                  })}
                </option>
                {vInfo.corePctKey && (
                  <option value="percentage">
                    {translate({
                      id: "manifest.generator.coreMode.percentage",
                      message: "Percentage (%)",
                    })}
                  </option>
                )}
              </select>
            </div>
            {coreMode !== "none" && (
              <div className={styles.inputGroup}>
                <label htmlFor="coreValue">
                  <Translate id="manifest.generator.coreValue">Core Value</Translate>
                </label>
                <input
                  id="coreValue"
                  type="number"
                  min="0"
                  max="100"
                  value={coreValue}
                  onChange={(e) => {
                    let val = Math.max(0, parseInt(e.target.value) || 0);
                    val = Math.min(val, 100);
                    setCoreValue(val);
                  }}
                  className={styles.input}
                />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          aria-expanded={advanced}
          className={clsx(styles.advancedToggle, styles.interactiveText)}
          onClick={() => setAdvanced(!advanced)}
          style={{ background: "none", border: "none", padding: 0 }}
        >
          <span>
            {advanced ? "▼ " : "▶ "}
            <Translate id="manifest.generator.advanced">
              Advanced Configurations (Device Type / UUID)
            </Translate>
          </span>
        </button>

        {advanced && vInfo.typeKey && (
          <div className={styles.inputGroup}>
            <label htmlFor="deviceType">
              <Translate id="manifest.generator.deviceType">
                Specific Device Type Constraints (e.g. NVIDIA-A100)
              </Translate>
            </label>
            <input
              id="deviceType"
              type="text"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              placeholder={translate({
                id: "manifest.generator.emptyPlaceholder",
                message: "Leave empty for any",
              })}
              className={styles.input}
            />
          </div>
        )}

        {advanced && vInfo.uuidKey && (
          <div className={styles.inputGroup}>
            <label htmlFor="deviceUuid">
              <Translate id="manifest.generator.deviceUuid">
                Specific Device UUID (e.g. GPU-fef808...)
              </Translate>
            </label>
            <input
              id="deviceUuid"
              type="text"
              value={deviceUuid}
              onChange={(e) => setDeviceUuid(e.target.value)}
              placeholder={translate({
                id: "manifest.generator.emptyPlaceholder",
                message: "Leave empty for any",
              })}
              className={styles.input}
            />
          </div>
        )}
      </div>

      <div className={styles.previewPanel}>
        <h3>
          <Translate id="manifest.generator.previewTitle">Generated YAML Manifest</Translate>
        </h3>
        <p>
          <Translate id="manifest.generator.previewDesc">
            Integrate this into your Kubernetes Pod or Deployment spec.
          </Translate>
        </p>
        <CodeBlock language="yaml" title="pod.yaml">
          {yamlCode}
        </CodeBlock>
      </div>
    </div>
  );
}
