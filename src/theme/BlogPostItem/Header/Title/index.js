import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import styles from "./styles.module.css";

export default function BlogPostItemHeaderTitle({ className }) {
  const { metadata, frontMatter, isBlogPostPage } = useBlogPost();
  const { permalink, title } = metadata;
  const listTitle = frontMatter?.sidebar_label || metadata?.frontMatter?.sidebar_label || title;
  const TitleHeading = isBlogPostPage ? "h1" : "h2";

  return (
    <TitleHeading className={clsx(styles.title, className)}>
      {isBlogPostPage ? title : <Link to={permalink}>{listTitle}</Link>}
    </TitleHeading>
  );
}
