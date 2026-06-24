/**
 * Card grid for the tutorials landing page.
 * Each item: { href, title, description, level, duration }.
 * The level badge label localizes itself through LevelBadge.
 */
import React from "react";
import Link from "@docusaurus/Link";
import LevelBadge from "./LevelBadge";
import styles from "./LabCardGrid.module.css";

export default function LabCardGrid({ items }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <Link key={item.href} to={item.href} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>{item.title}</span>
            <LevelBadge level={item.level} />
          </div>
          <p className={styles.cardDescription}>{item.description}</p>
          {item.duration && <div className={styles.cardFooter}>{item.duration}</div>}
        </Link>
      ))}
    </div>
  );
}
