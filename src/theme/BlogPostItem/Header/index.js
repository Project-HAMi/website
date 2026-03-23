import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import Translate from '@docusaurus/Translate';
import BlogPostItemHeaderTitle from '@theme/BlogPostItem/Header/Title';
import BlogPostItemHeaderInfo from '@theme/BlogPostItem/Header/Info';
import BlogPostItemHeaderAuthors from '@theme/BlogPostItem/Header/Authors';
import styles from './styles.module.css';

function formatDate(date, locale) {
  const language = locale === 'zh' ? 'zh-CN' : 'en-US';
  return new Date(date).toLocaleDateString(language, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

function formatAuthors(metadata, fallbackLabel) {
  const names = (metadata.authors || [])
    .map((author) => author?.name)
    .filter(Boolean);
  if (names.length === 0) {
    return fallbackLabel;
  }
  return names.join(', ');
}

export default function BlogPostItemHeader() {
  const {metadata, frontMatter, isBlogPostPage} = useBlogPost();
  const {i18n} = useDocusaurusContext();
  const cover = frontMatter.cover;
  const fallbackLabel = (
    <Translate
      id="theme.hami.blog.meta.unknownAuthor"
      description="Default author name for blog posts when no authors are specified">
      HAMi Community
    </Translate>
  );

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
            <strong>
              <Translate
                id="theme.hami.blog.meta.authorLabel"
                description="Label for blog post author metadata">
                Author
              </Translate>
              :
            </strong>{' '}
            {formatAuthors(metadata, fallbackLabel)}
          </div>
          <div className={styles.metaItem}>
            <strong>
              <Translate
                id="theme.hami.blog.meta.publishedLabel"
                description="Label for blog post publish date metadata">
                Published
              </Translate>
              :
            </strong>{' '}
            {formatDate(metadata.date, i18n.currentLocale)}
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
