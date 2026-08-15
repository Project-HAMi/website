/**
 * Custom swizzle of DocItem/Layout
 * Moves DocVersionBadge inline with DocBreadcrumbs on desktop so the version
 * badge doesn't waste a full row by itself.
 */
import React, { useMemo } from "react";
import clsx from "clsx";
import Head from "@docusaurus/Head";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useRouteContext from "@docusaurus/useRouteContext";
import { useWindowSize } from "@docusaurus/theme-common";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import DocItemPaginator from "@theme/DocItem/Paginator";
import DocVersionBanner from "@theme/DocVersionBanner";
import DocVersionBadge from "@theme/DocVersionBadge";
import DocItemFooter from "@theme/DocItem/Footer";
import DocItemTOCMobile from "@theme/DocItem/TOC/Mobile";
import DocItemTOCDesktop from "@theme/DocItem/TOC/Desktop";
import DocItemContent from "@theme/DocItem/Content";
import DocBreadcrumbs from "@theme/DocBreadcrumbs";
import ContentVisibility from "@theme/ContentVisibility";
import styles from "./styles.module.css";
import useImageLightbox from "../../utils/useImageLightbox";
import { buildTechArticleJsonLd, serializeJsonLd } from "../../../utils/jsonLd";

function useDocTOC() {
  const { frontMatter, toc } = useDoc();
  const windowSize = useWindowSize();
  const hidden = frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;
  const mobile = canRender ? <DocItemTOCMobile /> : undefined;
  const desktop =
    canRender && (windowSize === "desktop" || windowSize === "ssr") ? (
      <DocItemTOCDesktop />
    ) : undefined;
  return { hidden, mobile, desktop };
}

export default function DocItemLayout({ children }) {
  useImageLightbox();
  const docTOC = useDocTOC();
  const { metadata, frontMatter } = useDoc();
  const { i18n, siteConfig } = useDocusaurusContext();
  const { plugin } = useRouteContext();
  const skipJsonLd = Boolean(frontMatter.unlisted || frontMatter.draft);
  const techArticleJsonLd = useMemo(() => {
    if (skipJsonLd) {
      return null;
    }
    return serializeJsonLd(
      buildTechArticleJsonLd({
        siteUrl: siteConfig.url,
        title: metadata.title,
        description: metadata.description,
        permalink: metadata.permalink,
        image: frontMatter.image,
        locale: i18n.currentLocale,
        lastUpdatedAt: metadata.lastUpdatedAt,
        version:
          plugin?.id === "tutorials"
            ? undefined
            : metadata.version === "current"
              ? "next"
              : metadata.version,
        organizationLogo: siteConfig.customFields?.defaultOgImage,
      }),
    );
  }, [
    skipJsonLd,
    siteConfig.url,
    siteConfig.customFields?.defaultOgImage,
    metadata.title,
    metadata.description,
    metadata.permalink,
    metadata.lastUpdatedAt,
    metadata.version,
    frontMatter.image,
    i18n.currentLocale,
    plugin?.id,
  ]);

  return (
    <>
      {techArticleJsonLd && (
        <Head>
          <script type="application/ld+json">{techArticleJsonLd}</script>
        </Head>
      )}
      <div className="row">
        <div className={clsx("col", !docTOC.hidden && styles.docItemCol)}>
          <ContentVisibility metadata={metadata} />
          <DocVersionBanner />
          <div className={styles.docItemContainer}>
            <article>
              <div className={styles.docBreadcrumbsRow}>
                <DocBreadcrumbs />
                <DocVersionBadge />
              </div>
              {docTOC.mobile}
              <DocItemContent>{children}</DocItemContent>
              <DocItemFooter />
            </article>
            <DocItemPaginator />
          </div>
        </div>
        {docTOC.desktop && <div className="col col--3">{docTOC.desktop}</div>}
      </div>
    </>
  );
}
