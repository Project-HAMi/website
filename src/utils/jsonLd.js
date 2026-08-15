const OFFICIAL_PROFILES = [
  "https://github.com/Project-HAMi",
  "https://www.linkedin.com/company/project-hami-io/",
  "https://x.com/HAMiProject",
];

function normalizeSiteUrl(siteUrl) {
  return String(siteUrl ?? "").replace(/\/+$/, "");
}

function absoluteUrl(siteUrl, path) {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${normalizeSiteUrl(siteUrl)}/${String(path).replace(/^\/+/, "")}`;
}

function schemaLanguage(locale) {
  if (typeof locale === "string" && locale.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  return locale || "en";
}

function canonicalPageUrl(siteUrl, permalink) {
  const absolutePermalink = absoluteUrl(siteUrl, permalink);
  if (!absolutePermalink) {
    return undefined;
  }
  const home = `${normalizeSiteUrl(siteUrl)}/`;
  return absolutePermalink === home ? absolutePermalink : absolutePermalink.replace(/\/$/, "");
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
  const pageUrl = canonicalPageUrl(siteUrl, permalink);
  const imageUrl = absoluteUrl(siteUrl, image || organizationLogo);
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
    ...(pageUrl && {
      url: pageUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
    }),
    ...(imageUrl && { image: imageUrl }),
    inLanguage: schemaLanguage(locale),
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
