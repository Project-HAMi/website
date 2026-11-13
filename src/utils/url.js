export function toAbsoluteSiteUrl(siteUrl, permalink) {
  if (typeof permalink === "string" && /^[a-z][a-z0-9+.-]*:/i.test(permalink)) {
    return permalink;
  }

  const base = String(siteUrl || "").replace(/\/+$/, "") + "/";
  const path = permalink ? String(permalink) : "";
  return new URL(path || ".", base).href;
}
