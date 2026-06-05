/**
 * Lab metadata strip for tutorial pages.
 * Renders level, duration, environment and cost badges from the `lab`
 * front matter block. Returns null on docs without that block, so it is
 * safe to mount for every doc page.
 */
import React from 'react';
import Translate from '@docusaurus/Translate';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import LevelBadge from './LevelBadge';
import styles from './LabMeta.module.css';

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
  return (
    <div className={styles.labMeta}>
      <LevelBadge level={lab.level} />
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
      {lab.verified && (
        <Item
          label={
            <Translate id="tutorials.lab.verified" description="Lab verified date label">
              Verified:
            </Translate>
          }>
          {lab.verified}
        </Item>
      )}
      {Array.isArray(lab.authors) && lab.authors.length > 0 && (
        <Item
          label={
            <Translate id="tutorials.lab.authors" description="Lab authors label">
              By:
            </Translate>
          }>
          {lab.authors.map((author, i) => (
            <React.Fragment key={author}>
              {i > 0 && ', '}
              <a href={`https://github.com/${author}`} target="_blank" rel="noopener noreferrer">
                @{author}
              </a>
            </React.Fragment>
          ))}
        </Item>
      )}
    </div>
  );
}
