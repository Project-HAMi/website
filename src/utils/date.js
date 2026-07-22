function lang(locale) {
  return locale === "zh" ? "zh-CN" : "en-US";
}

export function formatDate(dateStr, locale) {
  return new Intl.DateTimeFormat(lang(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateRange(startStr, endStr, locale) {
  return new Intl.DateTimeFormat(lang(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).formatRange(new Date(startStr), new Date(endStr));
}

export function formatDay(date, locale) {
  return date.toLocaleDateString(lang(locale), { day: "numeric" });
}

export function formatWeekday(date, locale) {
  return date.toLocaleDateString(lang(locale), { weekday: "short" });
}

export function formatFullDate(date, locale) {
  return date.toLocaleDateString(lang(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(isoStr, locale) {
  return new Date(isoStr).toLocaleTimeString(lang(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
