/**
 * Custom swizzle of DocCategoryGeneratedIndexPage.
 * Keeps generated section landing pages visually aligned with regular docs.
 */
import React from "react";
import clsx from "clsx";
import { PageMetadata } from "@docusaurus/theme-common";
import { useCurrentSidebarCategory } from "@docusaurus/plugin-content-docs/client";
import useBaseUrl from "@docusaurus/useBaseUrl";
import DocCardList from "@theme/DocCardList";
import DocPaginator from "@theme/DocPaginator";
import DocVersionBanner from "@theme/DocVersionBanner";
import DocVersionBadge from "@theme/DocVersionBadge";
import DocBreadcrumbs from "@theme/DocBreadcrumbs";
import Heading from "@theme/Heading";

import styles from "./styles.module.css";

function DocCategoryGeneratedIndexPageMetadata({ categoryGeneratedIndex }) {
  return (
    <PageMetadata
      title={categoryGeneratedIndex.title}
      description={categoryGeneratedIndex.description}
      keywords={categoryGeneratedIndex.keywords}
      image={useBaseUrl(categoryGeneratedIndex.image)}
    />
  );
}

function DocCategoryGeneratedIndexPageContent({ categoryGeneratedIndex }) {
  const category = useCurrentSidebarCategory();
  return (
    <div className={styles.generatedIndexPage}>
      <DocVersionBanner />
      <div className={styles.breadcrumbsRow}>
        <DocBreadcrumbs />
        <DocVersionBadge />
      </div>
      <div className={clsx("theme-doc-markdown markdown", styles.indexCard)}>
        <header>
          <Heading as="h1">{categoryGeneratedIndex.title}</Heading>
          {categoryGeneratedIndex.description && <p>{categoryGeneratedIndex.description}</p>}
        </header>
        <article className="margin-top--lg">
          <DocCardList items={category.items} className={styles.list} />
        </article>
      </div>
      <footer className="margin-top--md">
        <DocPaginator
          previous={categoryGeneratedIndex.navigation.previous}
          next={categoryGeneratedIndex.navigation.next}
        />
      </footer>
    </div>
  );
}

export default function DocCategoryGeneratedIndexPage(props) {
  return (
    <>
      <DocCategoryGeneratedIndexPageMetadata {...props} />
      <DocCategoryGeneratedIndexPageContent {...props} />
    </>
  );
}
