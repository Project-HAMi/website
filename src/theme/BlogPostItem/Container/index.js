import React from 'react';
import clsx from 'clsx';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';

export default function BlogPostItemContainer({children, className}) {
  const {isBlogPostPage} = useBlogPost();

  return (
    <article
      className={clsx(
        className,
        isBlogPostPage ? 'hamiBlogPostArticle' : 'hamiBlogListCard',
      )}>
      {children}
    </article>
  );
}
