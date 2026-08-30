import React from "react";
import clsx from "clsx";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import Translate from "@docusaurus/Translate";
import BlogPostItemHeaderTitle from "@theme/BlogPostItem/Header/Title";
import BlogPostItemHeaderInfo from "@theme/BlogPostItem/Header/Info";
import BlogPostItemHeaderAuthors from "@theme/BlogPostItem/Header/Authors";
import { formatNumericDate } from "@site/src/utils/date";
import styles from "./styles.module.css";

function renderAuthors(metadata, fallbackLabel) {
  const authors = metadata.authors || [];
  const namedAuthors = authors.filter((author) => author?.name);
  if (namedAuthors.length === 0) {
    return fallbackLabel;
  }
  return namedAuthors.map((author, index) => {
    const name = author.name;
    const separator = index < namedAuthors.length - 1 ? ", " : null;
    const key = author.key || `author-${index}`;
    return (
      <React.Fragment key={key}>
        {author.url ? (
          <a href={author.url} target="_blank" rel="noopener noreferrer">
            {name}
          </a>
        ) : (
          name
        )}
        {separator}
      </React.Fragment>
    );
  });
}

export default function BlogPostItemHeader() {
  const { metadata, frontMatter, isBlogPostPage } = useBlogPost();
  const { i18n } = useDocusaurusContext();
  const cover = frontMatter.cover;
  const coverUrl = useBaseUrl(cover || "");
  const fallbackLabel = (
    <Translate
      id="theme.hami.blog.meta.unknownAuthor"
      description="Default author name for blog posts when no authors are specified"
    >
      HAMi Community
    </Translate>
  );

  return (
    <header>
      {isBlogPostPage && cover && (
        <div className={styles.coverWrap}>
          <img className={styles.cover} src={coverUrl} alt={frontMatter.title || metadata.title} />
        </div>
      )}
      <BlogPostItemHeaderTitle />
      {isBlogPostPage && (
        <div className={clsx(styles.metaBox, "hami-section-card")}>
          <div className={styles.metaItem}>
            <strong>
              <Translate
                id="theme.hami.blog.meta.authorLabel"
                description="Label for blog post author metadata"
              >
                Author
              </Translate>
              :
            </strong>{" "}
            {renderAuthors(metadata, fallbackLabel)}
          </div>
          <div className={styles.metaItem}>
            <strong>
              <Translate
                id="theme.hami.blog.meta.publishedLabel"
                description="Label for blog post publish date metadata"
              >
                Published
              </Translate>
              :
            </strong>{" "}
            {formatNumericDate(metadata.date, i18n.currentLocale)}
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
