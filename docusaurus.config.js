const { themes } = require("prism-react-renderer");
//const lightTheme = themes.github;
//const darkTheme = themes.dracula;
const defaultLocale = 'en';

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: "HAMi",
  tagline: "Open, Device Virtualization, VGPU, Heterogeneous AI Computing",
  url: "https://project-hami.io",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  organizationName: "hami-io",
  projectName: "website",
  favicon: "img/favicon.ico",
  i18n: {
    defaultLocale: defaultLocale,
    locales: ["en", "zh"],
    localeConfigs: {
      en: {
        label: "English",
      },
      zh: {
        label: "简体中文",
      },
    },
  },
  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/favicons/apple-touch-icon.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicons/favicon-32x32.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicons/favicon-16x16.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "shortcut icon",
        type: "image/png",
        href: "/favicons/favicon-16x16.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "manifest",
        href: "/favicons/site.webmanifest",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "mask-icon",
        color: "#ffffff",
        href: "/favicons/safari-pinned-tab.svg",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "theme-color",
        content: "#ffffff",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "msapplication-config",
        content: "/favicons/browserconfig.xml",
      },
    },
  ],
  /*
  plugins: [
    [
      './src/plugins/changelog/index.js',
      {
        blogTitle: 'HAMi Changelog',
        blogDescription:
          'Keep yourself up-to-date about new features in every release',
        blogSidebarCount: 'ALL',
        blogSidebarTitle: 'Changelog',
        routeBasePath: '/changelog',
        showReadingTime: false,
        postsPerPage: 20,
        archiveBasePath: null,
        authorsMapPath: 'authors.json',
        onInlineAuthors: 'warn',
      },
    ],
  ],*/
  themeConfig: {
    announcementBar: {
      id: "start",
      content:
        '⭐️ If you like HAMi, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/Project-HAMi/HAMi">GitHub</a>! ⭐️',
    },
    algolia: {
      appId: "IWSUKSVX6L",
      apiKey: "30ef663a029bb4c66929ac376ae3624c",
      indexName: "project-hami",
      // contextualSearch ensures that search results are relevant to the current language and version.
      contextualSearch: true,
    },
    navbar: {
      title: "HAMi",
      logo: {
        alt: "HAMi",
        src: "img/hami-graph-color.svg",
        srcDark: "img/hami-graph-color.svg",
      },
      items: [
        {
          type: "docsVersionDropdown",
          position: "right",
        },
        {
          to: "docs",
          activeBasePath: "docs",
          label: "Documentation",
          position: "left",
        },
        {
          to: "blog",
          label: "Blog",
          position: "left",
        },
        {
          label: 'Changelog',
          to: '/changelog',
          position: "left",
        },
        {
          to: "adopters",
          activeBasePath: "adopters",
          label: "Adopters",
          position: "left",
        },
        {
          type: "localeDropdown",
          position: "right",
        },
        {
          href: "https://github.com/Project-HAMi/HAMi",
          className: "header-github-link",
          position: "right",
        },
      ],
    },
    footer: {
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Documentation",
              to: "/docs/",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "CNCF Slack ",
              href: "https://slack.cncf.io/",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/Project-HAMi/HAMi",
            },
            {
              label: "Blog",
              to: "/blog",
            },
          ],
        },
      ],
      copyright: `
        <br />
        <strong>© HAMi Authors ${new Date().getFullYear()} | Documentation Distributed under <a href="https://creativecommons.org/licenses/by/4.0">CC-BY-4.0</a> </strong> <strong>| Powered by <a href="https://www.netlify.com">Netlify</a></strong>
        <br />
        <br />
        Copyright © HAMi \n For website terms of use, trademark policy and other project policies please see lfprojects.org/policies/.
      `,
    },
    prism: {
      additionalLanguages: ["bash", "diff", "json"],
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: function ({ locale, docPath }) {
            return `https://github.com/Project-HAMi/website/edit/main/docs/${docPath}`;
          },
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          includeCurrentVersion: true,
        },
        gtag: {
          trackingID: "UA-195246198-1",
          anonymizeIP: false,
        },
        blog: {
          showReadingTime: true,
          editUrl: "https://github.com/Project-HAMi/website/tree/main/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
