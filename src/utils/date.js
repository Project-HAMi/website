const LOCALE_MAP = { zh: "zh-CN", en: "en-US" };

// Date-only frontmatter/API values (e.g. "2026-01-05") parse to UTC midnight,
// so these must format in UTC or the date shifts by a day west of UTC.
function utcDateFormat(locale, month) {
  return new Intl.DateTimeFormat(LOCALE_MAP[locale], {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDate(dateStr, locale) {
  return utcDateFormat(locale, "long").format(new Date(dateStr));
}

export function formatShortDate(dateStr, locale) {
  return utcDateFormat(locale, "short").format(new Date(dateStr));
}

export function formatNumericDate(dateStr, locale) {
  return utcDateFormat(locale, "numeric").format(new Date(dateStr));
}

export function formatDateRange(startStr, endStr, locale) {
  const fmt = utcDateFormat(locale, "long");
  // formatRange isn't available in every supported environment (e.g. older Safari).
  if (typeof fmt.formatRange !== "function") {
    return `${fmt.format(new Date(startStr))} - ${fmt.format(new Date(endStr))}`;
  }
  return fmt.formatRange(new Date(startStr), new Date(endStr));
}

// These take local Dates from the events calendar, so no UTC here.
export function formatDay(date, locale) {
  return date.toLocaleDateString(LOCALE_MAP[locale], { day: "numeric" });
}

export function formatWeekday(date, locale) {
  return date.toLocaleDateString(LOCALE_MAP[locale], { weekday: "short" });
}

export function formatFullDate(date, locale) {
  return date.toLocaleDateString(LOCALE_MAP[locale], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(isoStr, locale) {
  return new Date(isoStr).toLocaleTimeString(LOCALE_MAP[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
