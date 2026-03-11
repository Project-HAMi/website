export function getContentLinkTitle(frontMatter = {}, fallbackTitle) {
  return frontMatter.linktitle || frontMatter.sidebar_label || fallbackTitle;
}

export function getDocLinkTitle(doc) {
  if (!doc) {
    return undefined;
  }
  return getContentLinkTitle(doc.frontMatter, doc.title);
}

export function getBlogLinkTitle(metadata, frontMatter) {
  return getContentLinkTitle(frontMatter || metadata?.frontMatter, metadata?.title);
}
