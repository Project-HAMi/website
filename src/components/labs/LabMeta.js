/**
 * Lab metadata strip for tutorial pages.
 * Renders level, duration, environment and cost badges from the `lab`
 * front matter block. Returns null on docs without that block, so it is
 * safe to mount for every doc page.
 */
import React from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import styles from './LabMeta.module.css';

const LEVEL_META = {
  Beginner: {
    className: 'levelBeginner',
    label: (
      <Translate id="tutorials.lab.level.beginner" description="Beginner lab level badge">
        Beginner
      </Translate>
    ),
  },
  Intermediate: {
    className: 'levelIntermediate',
    label: (
      <Translate id="tutorials.lab.level.intermediate" description="Intermediate lab level badge">
        Intermediate
      </Translate>
    ),
  },
  Advanced: {
    className: 'levelAdvanced',
    label: (
      <Translate id="tutorials.lab.level.advanced" description="Advanced lab level badge">
        Advanced
      </Translate>
    ),
  },
};

function Item({label, children}) {
  return (
    <span className={styles.item}>
      <span className={styles.itemLabel}>{label}</span> {children}
    </span>
  );
}

export default function LabMeta() {
  const {frontMatter} = useDoc();
  const lab = frontMatter.lab;
  if (!lab) {
    return null;
  }
  const level = LEVEL_META[lab.level];
  return (
    <div className={styles.labMeta}>
      {level && (
        <span className={clsx(styles.badge, styles[level.className])}>{level.label}</span>
      )}
      {lab.duration && (
        <Item
          label={
            <Translate id="tutorials.lab.duration" description="Lab duration label">
              Duration:
            </Translate>
          }>
          {lab.duration}
        </Item>
      )}
      {lab.environment && (
        <Item
          label={
            <Translate id="tutorials.lab.environment" description="Lab environment label">
              Environment:
            </Translate>
          }>
          {lab.environment}
        </Item>
      )}
      {lab.cost && (
        <Item
          label={
            <Translate id="tutorials.lab.cost" description="Lab cost label">
              Cost:
            </Translate>
          }>
          {lab.cost}
        </Item>
      )}
    </div>
  );
}
