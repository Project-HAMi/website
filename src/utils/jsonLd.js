const OFFICIAL_PROFILES = [
  "https://github.com/Project-HAMi",
  "https://www.linkedin.com/company/project-hami-io/",
  "https://x.com/HAMiProject",
];

function normalizeSiteUrl(siteUrl) {
  return siteUrl.replace(/\/+$/, "");
}

function absoluteUrl(siteUrl, path) {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${normalizeSiteUrl(siteUrl)}/${path.replace(/^\/+/, "")}`;
}

function organizationReference(siteUrl, name = "HAMi", logoPath) {
  return {
    "@type": "Organization",
    "@id": `${normalizeSiteUrl(siteUrl)}/#organization`,
    name,
    url: `${normalizeSiteUrl(siteUrl)}/`,
    ...(logoPath && {
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteUrl, logoPath),
      },
    }),
  };
}

export function buildSiteJsonLd({
  siteUrl,
  name,
  description,
  logoPath,
  profiles = OFFICIAL_PROFILES,
}) {
  const rootUrl = `${normalizeSiteUrl(siteUrl)}/`;
  const organizationId = `${rootUrl}#organization`;
  const websiteId = `${rootUrl}#website`;
  const organization = {
    ...organizationReference(siteUrl, name, logoPath),
    sameAs: profiles,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": websiteId,
        name,
        url: rootUrl,
        description,
        inLanguage: ["en", "zh-CN"],
        publisher: {
          "@id": organizationId,
        },
      },
    ],
  };
}

export function buildTechArticleJsonLd({
  siteUrl,
  title,
  description,
  permalink,
  image,
  locale,
  lastUpdatedAt,
  version,
  organizationName = "HAMi",
  organizationLogo = "/img/hami-graph-color.png",
}) {
  const absolutePermalink = absoluteUrl(siteUrl, permalink);
  const pageUrl =
    absolutePermalink === `${normalizeSiteUrl(siteUrl)}/`
      ? absolutePermalink
      : absolutePermalink.replace(/\/$/, "");
  const lastUpdatedDate = Number.isFinite(lastUpdatedAt) ? new Date(lastUpdatedAt) : undefined;
  const modifiedDate =
    lastUpdatedDate && !Number.isNaN(lastUpdatedDate.getTime())
      ? lastUpdatedDate.toISOString()
      : undefined;
  const organization = organizationReference(siteUrl, organizationName, organizationLogo);

  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    ...(description && { description }),
    url: pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    ...(image && { image: absoluteUrl(siteUrl, image) }),
    inLanguage: locale.startsWith("zh") ? "zh-CN" : locale,
    ...(modifiedDate && { dateModified: modifiedDate }),
    ...(version && { version }),
    author: organization,
    publisher: organization,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${normalizeSiteUrl(siteUrl)}/#website`,
    },
  };
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
