const STRIP_ATTRS = /\s(on\w+|style|class|id|data-\w+)\s*=\s*"[^"]*"/gi;
const STRIP_TAGS = /<(?!\/?(a|b|i|em|strong|u|ul|ol|li|br|p)\b)[^>]*>/gi;
const URL_RE = /(?<!href="|">)(https?:\/\/[^\s<>"')\]]+)/gi;

export function sanitizeCalendarDescription(text) {
  if (!text) return "";
  let out = text.replace(/\\n/g, "");
  out = out.replace(/:\w+:/g, "");
  out = out.replace(STRIP_TAGS, "");
  out = out.replace(STRIP_ATTRS, "");
  out = out.replace(URL_RE, '<a href="$1">$1</a>');
  return out;
}
