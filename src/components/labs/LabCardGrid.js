/**
 * Card grid for the tutorials landing page.
 * Each item: { href, title, description, level, levelLabel, duration }.
 * levelLabel allows localized badge text while `level` stays the
 * canonical key used for the color mapping.
 */
import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './LabCardGrid.module.css';

const LEVEL_CLASS = {
  Beginner: 'levelBeginner',
  Intermediate: 'levelIntermediate',
  Advanced: 'levelAdvanced',
};

export default function LabCardGrid({items}) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <Link key={item.href} to={item.href} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>{item.title}</span>
            {item.level && (
              <span className={clsx(styles.badge, styles[LEVEL_CLASS[item.level]])}>
                {item.levelLabel || item.level}
              </span>
            )}
          </div>
          <p className={styles.cardDescription}>{item.description}</p>
          {item.duration && <div className={styles.cardFooter}>{item.duration}</div>}
        </Link>
      ))}
    </div>
  );
}
