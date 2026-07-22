const LOCALE_MAP = { zh: "zh-CN", en: "en-US" };

export function formatDate(dateStr, locale) {
  return new Intl.DateTimeFormat(LOCALE_MAP[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateRange(startStr, endStr, locale) {
  return new Intl.DateTimeFormat(LOCALE_MAP[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).formatRange(new Date(startStr), new Date(endStr));
}

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
