/**
 * Auto-generated card grid for the tutorials landing page.
 *
 * Derives every card from the resolved sidebar + the current docs version, so it
 * never goes stale. Add a lab by (1) creating its doc with a `description:` +
 * `lab:` front matter block and (2) adding it to sidebars-tutorials.js — that
 * alone makes it appear here and on /tutorials/category/labs, in every locale.
 *
 * Field sources (single source of truth each):
 *   - title, description: the lab doc itself (per-locale)
 *   - href: the resolved sidebar link (per-locale)
 *   - level, duration: the sidebar entry's `customProps`, mapped to translated
 *     labels below and in LevelBadge
 *
 * `useDocsVersion().docs` intentionally omits `frontMatter`, so level/duration
 * are read from sidebar `customProps` instead of the `lab:` front matter block.
 */
import React from "react";
import Link from "@docusaurus/Link";
import Translate from "@docusaurus/Translate";
import {
  useDocsSidebar,
  useDocsVersion,
  findSidebarCategory,
} from "@docusaurus/plugin-content-docs/client";
import LevelBadge from "./LevelBadge";
import styles from "./LabCardGrid.module.css";

// Keyed by the English label, like LEVELS in LevelBadge. The ids have to be
// static or `write-translations` has nothing to extract; passing the sidebar
// value straight to <Translate> leaves the extractor with a runtime expression.
const DURATIONS = {
  "about 30 minutes": (
    <Translate id="tutorials.lab.duration.30min" description="Lab duration of about 30 minutes">
      about 30 minutes
    </Translate>
  ),
  "about 40 minutes": (
    <Translate id="tutorials.lab.duration.40min" description="Lab duration of about 40 minutes">
      about 40 minutes
    </Translate>
  ),
  "about 45 minutes": (
    <Translate id="tutorials.lab.duration.45min" description="Lab duration of about 45 minutes">
      about 45 minutes
    </Translate>
  ),
  "about 60 minutes": (
    <Translate id="tutorials.lab.duration.60min" description="Lab duration of about 60 minutes">
      about 60 minutes
    </Translate>
  ),
};

// Match the labs category by the doc ids it contains (locale-independent),
// not by its (possibly translated) label.
function isLabsCategory(category) {
  return (category.items ?? []).some((item) => {
    const id = item.docId ?? item.id ?? "";
    return typeof id === "string" && id.startsWith("labs/");
  });
}

export default function LabCardGridAuto() {
  const sidebar = useDocsSidebar();
  const { docs } = useDocsVersion();

  const labsCategory = findSidebarCategory(sidebar?.items ?? [], isLabsCategory);

  const cards = (labsCategory?.items ?? [])
    .filter((item) => item.type === "link" && item.docId)
    .map((item) => {
      const doc = docs[item.docId];
      if (!doc) {
        return null;
      }
      const { level, duration } = item.customProps ?? {};
      return {
        key: item.docId,
        href: item.href,
        title: doc.title,
        description: doc.description,
        level,
        duration,
      };
    })
    .filter(Boolean);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <Link key={card.key} to={card.href} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>{card.title}</span>
            <LevelBadge level={card.level} />
          </div>
          {card.description && <p className={styles.cardDescription}>{card.description}</p>}
          {card.duration && (
            <div className={styles.cardFooter}>{DURATIONS[card.duration] ?? card.duration}</div>
          )}
        </Link>
      ))}
    </div>
  );
}
