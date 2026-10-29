import { VENDORS } from "./manifest-vendors.js";

/** Format unindented annotation and limit entries as a Pod manifest. */
export function formatPodManifest(vendor, annotations, limits) {
  const podName = `hami-${vendor.toLowerCase().replace(/_/g, "-")}-pod`;
  let code = `apiVersion: v1
kind: Pod
metadata:
  name: ${podName}
`;
  if (annotations.length > 0) {
    code += `  annotations:\n${annotations.map((annotation) => `    ${annotation}`).join("\n")}\n`;
  }
  code += `spec:\n`;
  if (vendor.startsWith("ASCEND_")) {
    // The Ascend runtime class is optional and its name is configurable.
    code += `  # runtimeClassName: ascend  # enable if your cluster uses the Ascend runtime class\n`;
  }
  code += `  containers:
    - name: hami-container
      image: ubuntu:22.04
      command: ["sleep", "infinity"]
      resources:
        limits:
${limits.map((limit) => `          ${limit}`).join("\n")}`;
  return code;
}

/** Generate the Pod YAML shown by the component from its selected vendor and form values. */
export function generatePodManifest(vendor, options = {}) {
  const v = VENDORS[vendor];
  const {
    deviceCount = 1,
    memMode = "value",
    memValue = v.defaultMem,
    coreMode = "none",
    coreValue = 50,
    advanced = false,
    deviceType = "",
    deviceUuid = "",
  } = options;
  const annotations = [];
  const limits = [];

  limits.push(`${v.resourceKey}: ${deviceCount}`);

  const omitMultiDeviceMem =
    deviceCount > 1 &&
    (vendor === "HYGON" || vendor.startsWith("ILUVATAR_") || vendor.startsWith("ASCEND_"));
  const omitMultiDeviceCore =
    deviceCount > 1 && (vendor === "HYGON" || vendor.startsWith("ILUVATAR_"));

  if (v.memKey && !omitMultiDeviceMem) {
    if (memMode === "value" && v.memUnit !== "%") {
      limits.push(`${v.memKey}: ${memValue}`);
    } else if (memMode === "percentage" && v.memPctKey) {
      limits.push(`${v.memPctKey}: ${memValue}`);
    } else if (v.memUnit === "%") {
      limits.push(`${v.memPctKey || v.memKey}: ${memValue}`);
    }
  }

  if (v.coreKey && coreMode !== "none" && !omitMultiDeviceCore) {
    if (coreMode === "value") {
      limits.push(`${v.coreKey}: ${coreValue}`);
    } else if (coreMode === "percentage" && v.corePctKey) {
      limits.push(`${v.corePctKey}: ${coreValue}`);
    }
  }

  if (advanced) {
    if (deviceType && v.typeKey) {
      annotations.push(`${v.typeKey}: ${JSON.stringify(deviceType)}`);
    }
    if (deviceUuid && v.uuidKey) {
      annotations.push(`${v.uuidKey}: ${JSON.stringify(deviceUuid)}`);
    }
  }

  return formatPodManifest(vendor, annotations, limits);
}
