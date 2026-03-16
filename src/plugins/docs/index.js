import pluginContentDocs from '@docusaurus/plugin-content-docs';

function withLinkTitle(frontMatter = {}) {
  if (!frontMatter.linktitle || frontMatter.sidebar_label) {
    return frontMatter;
  }

  return {
    ...frontMatter,
    sidebar_label: frontMatter.linktitle,
  };
}

function patchLoadedVersion(version) {
  return {
    ...version,
    docs: version.docs.map((doc) => ({
      ...doc,
      frontMatter: withLinkTitle(doc.frontMatter),
    })),
  };
}

export default async function LinkTitleDocsPlugin(context, options) {
  const docsPlugin = await pluginContentDocs.default(context, options);

  return {
    ...docsPlugin,
    async loadContent() {
      const content = await docsPlugin.loadContent();

      return {
        ...content,
        loadedVersions: content.loadedVersions.map(patchLoadedVersion),
      };
    },
  };
}

export const {validateOptions} = pluginContentDocs;
