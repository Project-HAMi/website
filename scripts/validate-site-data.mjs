import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import events from "../src/data/events.js";
import caseStudies from "../src/data/caseStudies.js";
import adopters from "../src/data/adopters.json" with { type: "json" };
import ecosystem from "../src/data/ecosystem.json" with { type: "json" };
import heroStats from "../src/data/home/heroStats.js";
import valueCards from "../src/data/home/valueCards.js";
import vendorDevices from "../src/data/home/vendorDevices.js";
import { validateSiteData } from "../src/utils/siteDataValidation.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = path.join(rootDir, "static");

function assetExists(assetPath) {
  const assetFile = path.resolve(staticDir, assetPath.replace(/^\/+/, ""));
  return assetFile.startsWith(`${staticDir}${path.sep}`) && existsSync(assetFile);
}

const errors = validateSiteData(
  { events, caseStudies, adopters, ecosystem, heroStats, valueCards, vendorDevices },
  { assetExists },
);

if (errors.length > 0) {
  console.error("Site data validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("Site data validation passed.");
}
