/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {type ReactNode, useMemo, useState} from 'react';
import clsx from 'clsx';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import BlogLayout from '@theme/BlogLayout';
import BlogListPaginator from '@theme/BlogListPaginator';
import BlogPostItems from '@theme/BlogPostItems';
import SearchMetadata from '@theme/SearchMetadata';
import ChangelogItem from '@theme/ChangelogItem';
import ChangelogListHeader from '@theme/ChangelogList/Header';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {Props} from '@theme/BlogListPage';
import styles from './styles.module.css';

function ChangelogListMetadata(props: Props): ReactNode {
  const {metadata} = props;
  const {blogTitle, blogDescription} = metadata;
  return (
    <>
      <PageMetadata title={blogTitle} description={blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
    </>
  );
}

function Filters({
  years,
  year,
  tag,
  onYear,
  onTag,
}: {
  years: string[];
  year: string;
  tag: string;
  onYear: (v: string) => void;
  onTag: (v: string) => void;
}): ReactNode {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === 'zh';

  const tagLabels = {
    all: isZh ? '全部' : 'All',
    feature: isZh ? '新功能' : 'Feature',
    breaking: isZh ? '重大变更' : 'Breaking',
    compatibility: isZh ? '兼容性' : 'Compatibility',
    general: isZh ? '常规更新' : 'General',
  };

  return (
    <div className={styles.filters}>
      <label>
        {isZh ? '年份' : 'Year'}
        <select value={year} onChange={(e) => onYear(e.target.value)}>
          {years.map((y) => (
            <option key={y} value={y}>{y === 'all' ? (isZh ? '全部' : 'All') : y}</option>
          ))}
        </select>
      </label>
      <label>
        {isZh ? '标签' : 'Tag'}
        <select value={tag} onChange={(e) => onTag(e.target.value)}>
          {['all', 'feature', 'breaking', 'compatibility', 'general'].map((t) => (
            <option key={t} value={t}>{tagLabels[t]}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ChangelogListContent(props: Props): ReactNode {
  const {metadata, items, sidebar} = props;
  const {blogTitle} = metadata;
  const [year, setYear] = useState('all');
  const [tag, setTag] = useState('all');
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === 'zh';

  const years = useMemo(() => {
    const candidates = items
      .map((item) => item.content.metadata.frontMatter.release_year)
      .filter(Boolean);
    return ['all', ...Array.from(new Set(candidates))];
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const frontMatter = item.content.metadata.frontMatter;
        const itemYear = frontMatter.release_year;
        const itemTags = frontMatter.release_tags ?? [];
        return (year === 'all' || itemYear === year) &&
          (tag === 'all' || itemTags.includes(tag));
      }),
    [items, year, tag],
  );

  return (
    <BlogLayout sidebar={sidebar}>
      <ChangelogListHeader blogTitle={blogTitle} />
      <Filters years={years} year={year} tag={tag} onYear={setYear} onTag={setTag} />
      {filteredItems.length > 0 ? (
        <BlogPostItems items={filteredItems} component={ChangelogItem} />
      ) : (
        <div className={clsx(styles.empty, 'hami-section-card')}>
          {isZh ? '没有匹配此筛选条件的发布记录。' : 'No releases match this filter.'}
        </div>
      )}
      <BlogListPaginator metadata={metadata} />
    </BlogLayout>
  );
}

export default function ChangelogList(props: Props): ReactNode {
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}>
      <ChangelogListMetadata {...props} />
      <ChangelogListContent {...props} />
    </HtmlClassNameProvider>
  );
}
