/**
 * Difficulty badge shared by LabMeta and LabCardGrid.
 * Localizes the level label through code.json, so callers only pass the
 * canonical level key (Beginner | Intermediate | Advanced).
 */
import React from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import styles from './LevelBadge.module.css';

const LEVELS = {
  Beginner: {
    className: styles.beginner,
    label: (
      <Translate id="tutorials.lab.level.beginner" description="Beginner lab level badge">
        Beginner
      </Translate>
    ),
  },
  Intermediate: {
    className: styles.intermediate,
    label: (
      <Translate id="tutorials.lab.level.intermediate" description="Intermediate lab level badge">
        Intermediate
      </Translate>
    ),
  },
  Advanced: {
    className: styles.advanced,
    label: (
      <Translate id="tutorials.lab.level.advanced" description="Advanced lab level badge">
        Advanced
      </Translate>
    ),
  },
};

export default function LevelBadge({level}) {
  if (!level) {
    return null;
  }
  const meta = LEVELS[level];
  return (
    <span className={clsx(styles.badge, meta && meta.className)}>
      {meta ? meta.label : level}
    </span>
  );
}
