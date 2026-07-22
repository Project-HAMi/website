export function sanitizeCalendarDescription(text) {
  if (!text) return "";
  let out = text.replace(/\\n/g, " ");
  out = out.replace(/:\w+:/g, "");
  out = out.replace(/<[^>]*>/g, " ");
  return out.replace(/\s+/g, " ").trim();
}
