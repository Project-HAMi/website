import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import BlogPostItemHeaderTitle from '@theme/BlogPostItem/Header/Title';
import BlogPostItemHeaderInfo from '@theme/BlogPostItem/Header/Info';
import BlogPostItemHeaderAuthors from '@theme/BlogPostItem/Header/Authors';
import styles from './styles.module.css';

function formatAuthors(metadata) {
  const names = (metadata.authors || [])
    .map((author) => author?.name)
    .filter(Boolean);
  if (names.length === 0) {
    return 'HAMi Community';
  }
  return names.join(', ');
}

export default function BlogPostItemHeader() {
  const {metadata, frontMatter, isBlogPostPage} = useBlogPost();
  const cover = frontMatter.cover;

  return (
    <header>
      {isBlogPostPage && cover && (
        <div className={styles.coverWrap}>
          <img className={styles.cover} src={useBaseUrl(cover)} alt={frontMatter.title || metadata.title} />
        </div>
      )}
      <BlogPostItemHeaderTitle />
      {isBlogPostPage && (
        <div className={clsx(styles.metaBox, 'hami-section-card')}>
          <div className={styles.metaItem}>
            <strong>Author:</strong> {formatAuthors(metadata)}
          </div>
          <div className={styles.metaItem}>
            <strong>Published:</strong> {new Date(metadata.date).toLocaleDateString()}
          </div>
        </div>
      )}
      {!isBlogPostPage && (
        <>
          <BlogPostItemHeaderInfo />
          <BlogPostItemHeaderAuthors />
        </>
      )}
    </header>
  );
}
