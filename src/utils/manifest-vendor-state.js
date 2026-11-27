import { VENDORS } from "./manifest-vendors.js";

/** Reset vendor-specific form fields while keeping unrelated form state. */
export function switchManifestVendor(state, vendor) {
  const config = VENDORS[vendor];
  return {
    ...state,
    vendor,
    memMode: config.memUnit === "%" ? "percentage" : "value",
    memValue: config.defaultMem,
    coreMode: "none",
    coreValue: config.defaultCore ?? 50,
    deviceType: "",
    deviceUuid: "",
  };
}

export function clampCoreValue(vendor, value) {
  const max = VENDORS[vendor].maxCore ?? 100;
  return Math.min(Math.max(0, parseInt(value, 10) || 0), max);
}
