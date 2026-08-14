/**
 * RelatedLabs – tag-based, cross-plugin related-labs section.
 *
 * Concept pages (docs plugin) and lab pages (tutorials plugin) live in
 * two separate Docusaurus docs-plugin instances, so we cannot use
 * useDocsSidebar/useDocsVersion to reach across the boundary.
 *
 * Instead, the build-time helper `getLabData()` in docusaurus.config.js
 * extracts every lab's metadata (title, description, level, duration,
 * tags, href) and injects it into `siteConfig.customFields.labData`.
 * This component reads that static map and matches tags at render time.
 */
import React from "react";
import Link from "@docusaurus/Link";
import Translate from "@docusaurus/Translate";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import LevelBadge from "./LevelBadge";
import styles from "./RelatedLabs.module.css";
import gridStyles from "./LabCardGrid.module.css";

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
  "about 90 minutes": (
    <Translate id="tutorials.lab.duration.90min" description="Lab duration of about 90 minutes">
      about 90 minutes
    </Translate>
  ),
};

export default function RelatedLabs() {
  const { frontMatter } = useDoc();
  const pageTags = frontMatter?.tags ?? [];

  // Nothing to match against – render nothing.
  if (pageTags.length === 0) {
    return null;
  }

  const { siteConfig } = useDocusaurusContext();
  const labData = siteConfig.customFields?.labData ?? {};

  // Build cards for labs whose tags overlap with the current page's tags.
  const matchedCards = Object.entries(labData)
    .map(([docId, lab]) => {
      const labTags = lab.tags ?? [];
      const matchCount = labTags.filter((tag) => pageTags.includes(tag)).length;
      if (matchCount === 0) return null;
      return {
        key: docId,
        href: lab.href,
        title: lab.title,
        description: lab.description,
        level: lab.level,
        duration: lab.duration,
        matchCount,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchCount - a.matchCount);

  if (matchedCards.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>
        <span className={styles.icon}>🔬</span>
        <Translate id="theme.docs.relatedLabs.title" description="Title for related labs section">
          Related Hands-on Labs
        </Translate>
      </h3>
      <div className={gridStyles.grid}>
        {matchedCards.map((card) => (
          <Link key={card.key} to={card.href} className={gridStyles.card}>
            <div className={gridStyles.cardHeader}>
              <span className={gridStyles.cardTitle}>{card.title}</span>
              <LevelBadge level={card.level} />
            </div>
            {card.description && <p className={gridStyles.cardDescription}>{card.description}</p>}
            {card.duration && (
              <div className={gridStyles.cardFooter}>
                {DURATIONS[card.duration] ?? card.duration}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
