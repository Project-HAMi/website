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

export function getMaxCore(vendor) {
  return VENDORS[vendor].maxCore ?? 100;
}

export function clampCoreValue(vendor, value) {
  return Math.min(Math.max(0, parseInt(value, 10) || 0), getMaxCore(vendor));
}
