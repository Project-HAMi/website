const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_STATUSES = new Set([
  "EventScheduled",
  "EventCancelled",
  "EventPostponed",
  "EventRescheduled",
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidIsoDate(value) {
  if (!isNonEmptyString(value) || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isLocalAssetPath(value) {
  return isNonEmptyString(value) && !/^https?:\/\//.test(value);
}

function validateLocalizedValue(value, field, errors) {
  if (isNonEmptyString(value)) {
    return;
  }
  if (!value || typeof value !== "object") {
    errors.push(`${field} must be a non-empty string or localized value`);
    return;
  }
  for (const locale of ["en", "zh"]) {
    if (!isNonEmptyString(value[locale])) {
      errors.push(`${field}.${locale} must be a non-empty string`);
    }
  }
}

function validateRequiredString(value, field, errors) {
  if (!isNonEmptyString(value)) {
    errors.push(`${field} must be a non-empty string`);
  }
}

function validateOptionalAsset(value, field, assetExists, errors) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (!isLocalAssetPath(value)) {
    return;
  }
  if (!assetExists(value)) {
    errors.push(`${field} references missing static asset: ${value}`);
  }
}

function validateEvents(events, assetExists, errors) {
  const slugs = new Set();
  events.forEach((event, index) => {
    const field = `events[${index}]`;
    validateRequiredString(event.slug, `${field}.slug`, errors);
    if (event.slug) {
      if (slugs.has(event.slug)) {
        errors.push(`${field}.slug duplicates event slug: ${event.slug}`);
      }
      slugs.add(event.slug);
    }
    validateLocalizedValue(event.title, `${field}.title`, errors);
    validateLocalizedValue(event.location, `${field}.location`, errors);
    validateLocalizedValue(event.description, `${field}.description`, errors);
    if (!isValidIsoDate(event.date)) {
      errors.push(`${field}.date must be a valid ISO date`);
    }
    if (event.endDate !== undefined && !isValidIsoDate(event.endDate)) {
      errors.push(`${field}.endDate must be a valid ISO date`);
    }
    if (event.eventStatus !== undefined && !EVENT_STATUSES.has(event.eventStatus)) {
      errors.push(`${field}.eventStatus must be a supported Schema.org event status`);
    }
    validateOptionalAsset(event.banner, `${field}.banner`, assetExists, errors);

    for (const [name, resource] of Object.entries(event.resources ?? {})) {
      const resourceField = `${field}.resources.${name}`;
      validateLocalizedValue(resource, resourceField, errors);
      validateRequiredString(resource.url, `${resourceField}.url`, errors);
      validateOptionalAsset(resource.url, `${resourceField}.url`, assetExists, errors);
    }
  });
}

function validateCaseStudies(caseStudies, assetExists, errors) {
  caseStudies.forEach((caseStudy, index) => {
    const field = `caseStudies[${index}]`;
    validateRequiredString(caseStudy.name, `${field}.name`, errors);
    validateRequiredString(caseStudy.nameZh, `${field}.nameZh`, errors);
    validateRequiredString(caseStudy.logo, `${field}.logo`, errors);
    validateOptionalAsset(caseStudy.logo, `${field}.logo`, assetExists, errors);
    validateOptionalAsset(caseStudy.logoZh, `${field}.logoZh`, assetExists, errors);
    if (!isValidIsoDate(caseStudy.publishedAt)) {
      errors.push(`${field}.publishedAt must be a valid ISO date`);
    }
    validateLocalizedValue(caseStudy.metric, `${field}.metric`, errors);
    validateLocalizedValue(caseStudy.summary, `${field}.summary`, errors);
    if (!Array.isArray(caseStudy.highlights) || caseStudy.highlights.length === 0) {
      errors.push(`${field}.highlights must contain at least one localized value`);
    } else {
      caseStudy.highlights.forEach((highlight, highlightIndex) => {
        validateLocalizedValue(highlight, `${field}.highlights[${highlightIndex}]`, errors);
      });
    }
    validateRequiredString(caseStudy.url, `${field}.url`, errors);
  });
}

function validateLogoWallItems(items, source, assetExists, errors) {
  items.forEach((item, index) => {
    const field = `${source}[${index}]`;
    validateRequiredString(item.name, `${field}.name`, errors);
    validateRequiredString(item.nameZh, `${field}.nameZh`, errors);
    validateOptionalAsset(item.logo, `${field}.logo`, assetExists, errors);
    validateOptionalAsset(item.logoZh, `${field}.logoZh`, assetExists, errors);
  });
}

function validateHeroStats(heroStats, errors) {
  heroStats.forEach((stat, index) => {
    const field = `heroStats[${index}]`;
    validateRequiredString(stat.key, `${field}.key`, errors);
    validateLocalizedValue(stat.label, `${field}.label`, errors);
    validateLocalizedValue(stat.value, `${field}.value`, errors);
  });
}

function validateValueCards(valueCards, errors) {
  valueCards.forEach((card, index) => {
    const field = `valueCards[${index}]`;
    validateRequiredString(card.id, `${field}.id`, errors);
    validateRequiredString(card.icon, `${field}.icon`, errors);
    validateLocalizedValue(card.title, `${field}.title`, errors);
    validateLocalizedValue(card.description, `${field}.description`, errors);
  });
}

function validateVendorDevices(vendorDevices, assetExists, errors) {
  vendorDevices.forEach((vendor, index) => {
    const field = `vendorDevices[${index}]`;
    validateRequiredString(vendor.key, `${field}.key`, errors);
    validateRequiredString(vendor.name, `${field}.name`, errors);
    validateLocalizedValue(vendor.label, `${field}.label`, errors);
    validateRequiredString(vendor.logo, `${field}.logo`, errors);
    validateOptionalAsset(vendor.logo, `${field}.logo`, assetExists, errors);
    validateRequiredString(vendor.href, `${field}.href`, errors);
  });
}

export function validateSiteData(data, { assetExists = () => true } = {}) {
  const errors = [];
  validateEvents(data.events, assetExists, errors);
  validateCaseStudies(data.caseStudies, assetExists, errors);
  validateLogoWallItems(data.adopters, "adopters", assetExists, errors);
  validateLogoWallItems(data.ecosystem, "ecosystem", assetExists, errors);
  validateHeroStats(data.heroStats, errors);
  validateValueCards(data.valueCards, errors);
  validateVendorDevices(data.vendorDevices, assetExists, errors);
  return errors;
}
