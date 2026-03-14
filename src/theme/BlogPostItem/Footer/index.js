import React from 'react';
import clsx from 'clsx';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPenToSquare} from '@fortawesome/free-solid-svg-icons';
import {faLinkedinIn, faXTwitter} from '@fortawesome/free-brands-svg-icons';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import TagsListInline from '@theme/TagsListInline';
import ReadMoreLink from '@theme/BlogPostItem/Footer/ReadMoreLink';
import {getBlogLinkTitle} from '@theme/utils/linkTitle';
import styles from './styles.module.css';

function ShareButtons({permalink, title}) {
  const url = encodeURIComponent(permalink);
  const text = encodeURIComponent(title || '');

  return (
    <div className={styles.shareBlock}>
      <span className={styles.shareLabel}>Share</span>
      <a
        className={styles.shareButton}
        href={`https://twitter.com/intent/tweet?url=${url}&text=${text}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X">
        <FontAwesomeIcon icon={faXTwitter} />
      </a>
      <a
        className={styles.shareButton}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on LinkedIn">
        <FontAwesomeIcon icon={faLinkedinIn} />
      </a>
    </div>
  );
}

export default function BlogPostItemFooter() {
  const {metadata, frontMatter, isBlogPostPage} = useBlogPost();
  const {
    tags,
    title,
    editUrl,
    hasTruncateMarker,
  } = metadata;
  const listTitle = getBlogLinkTitle(metadata, frontMatter) || title;

  const truncatedPost = !isBlogPostPage && hasTruncateMarker;
  const tagsExists = tags.length > 0;
  const renderFooter = tagsExists || truncatedPost || editUrl;

  if (!renderFooter && !isBlogPostPage) {
    return null;
  }

  if (isBlogPostPage) {
    return (
      <footer className={clsx('docusaurus-mt-lg', styles.postFooter)}>
        {tagsExists && (
          <div className={styles.tagsRow}>
            <TagsListInline tags={tags} />
          </div>
        )}
        <div className={styles.actionsRow}>
          {editUrl && (
            <a className={styles.editLink} href={editUrl} target="_blank" rel="noreferrer">
              <FontAwesomeIcon icon={faPenToSquare} />
              <span>Edit this page</span>
            </a>
          )}
          <ShareButtons permalink={metadata.permalink} title={title} />
        </div>
      </footer>
    );
  }

  return (
    <footer className="row docusaurus-mt-lg">
      {tagsExists && (
        <div className={clsx('col', {'col--9': truncatedPost})}>
          <TagsListInline tags={tags} />
        </div>
      )}
      {truncatedPost && (
        <div
          className={clsx('col text--right', {
            'col--3': tagsExists,
          })}>
          <ReadMoreLink blogPostTitle={listTitle} to={metadata.permalink} />
        </div>
      )}
    </footer>
  );
}
