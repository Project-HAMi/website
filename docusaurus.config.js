const { themes } = require("prism-react-renderer");
const lightTheme = themes.github;
const darkTheme = themes.dracula;
const defaultLocale = 'en';

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: "HAMi",
  tagline: "Heterogeneous AI Computing Virtualization Middleware",
  url: "https://project-hami.io",
  baseUrl: "/",
  onBrokenLinks: "throw",
  trailingSlash: false,
  customFields: {
    defaultOgImage: "/img/hami-graph-color.png",
  },
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },
  organizationName: "hami-io",
  projectName: "website",
  favicon: "img/logo.svg",
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
      tagName: "script",
      attributes: {},
      innerHTML: `
        (function() {
          var localePreferenceKey = 'hami.locale.preference';
          var pathname = window.location.pathname || '/';
          var search = window.location.search || '';
          var hash = window.location.hash || '';
          var currentLocale = /^\\/zh(?:\\/|$)/.test(pathname) ? 'zh' : 'en';

          if (pathname !== '/') {
            if (currentLocale === 'zh') {
              try {
                window.localStorage.setItem(localePreferenceKey, currentLocale);
              } catch (e) {}
            }
            return;
          }

          var storedLocale = null;
          try {
            storedLocale = window.localStorage.getItem(localePreferenceKey);
          } catch (e) {}

          var browserLocales = Array.isArray(window.navigator.languages) && window.navigator.languages.length
            ? window.navigator.languages
            : [window.navigator.language || ''];
          var detectedLocale = browserLocales.some(function(locale) {
            return typeof locale === 'string' && locale.toLowerCase().indexOf('zh') === 0;
          }) ? 'zh' : 'en';
          var preferredLocale = storedLocale === 'zh' || storedLocale === 'en'
            ? storedLocale
            : detectedLocale;

          if (preferredLocale === 'zh') {
            window.location.replace('/zh/' + search + hash);
          }
        })();
      `,
    },
    {
      tagName: "script",
      attributes: {},
      innerHTML:
        "window.dataLayer=window.dataLayer||[];if(typeof window.gtag!=='function'){window.gtag=function(){window.dataLayer.push(arguments);};}",
    },
    {
      tagName: "meta",
      attributes: {
        name: "description",
        content:
          "HAMi is an open-source Kubernetes-native virtualization middleware for heterogeneous AI accelerators.",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "canonical",
        href: "https://project-hami.io/",
      },
    },
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
  plugins: [
    [
      './src/plugins/docs/index.js',
      {
        sidebarPath: require.resolve("./sidebars.js"),
        editUrl: function ({ locale, docPath }) {
          return `https://github.com/Project-HAMi/website/edit/master/docs/${docPath}`;
        },
        showLastUpdateAuthor: false,
        showLastUpdateTime: true,
        includeCurrentVersion: true,
      },
    ],
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
  ],
  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: ["/docs", "/zh/docs"],
        language: ["en", "zh"],
        hashed: "filename",
        docsPluginIdForPreferredVersion: "default",
        searchContextByPaths: ["docs", "zh/docs"],
        useAllContextsWithNoSearchContext: true,
        explicitSearchResultPath: true,
        ignoreFiles: [
          /^docs\/(?:next|v\d+\.\d+\.\d+)(?:\/|$)/,
          /^zh\/docs\/(?:next|v\d+\.\d+\.\d+)(?:\/|$)/,
        ],
      },
    ],
  ],
  themeConfig: {
    image: "img/hami-graph-color.png",
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: false,
    },
    announcementBar: {
      id: "kubecon-2026-europe", // Increment on change
      content: 'theme.announcementBar.message',
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
          to: "/",
          label: "Home",
          exact: true,
          position: "left",
        },
        {
          to: "/docs",
          activeBasePath: "docs",
          label: "Docs",
          position: "left",
        },
        {
          to: "/case-studies",
          activeBasePath: "case-studies",
          label: "Case Studies",
          position: "left",
        },
        {
          to: "/community",
          activeBasePath: "community",
          label: "Community",
          position: "left",
        },
        {
          to: "/blog",
          activeBasePath: "blog",
          label: "Blog",
          position: "left",
        },
        {
          label: "Releases",
          to: '/changelog',
          position: "left",
        },
        {
          type: "docsVersionDropdown",
          position: "right",
        },
        {
          type: "localeDropdown",
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
              label: "Install",
              to: "/docs/installation/online-installation",
            },
            {
              label: "Quick Start",
              to: "/docs/get-started/deploy-with-helm",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Slack ",
              href: "https://slack.cncf.io/",
            },
            {
              label: "Discord",
              href: "https://discord.gg/Amhy7XmbNq",
            },
            {
              label: "WeChat Group",
              href: "/community?wechat=group",
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
              label: "Releases",
              to: "/changelog",
            },
          ],
        },
      ],
      copyright: `
        <br />
        <strong>© HAMi Authors ${new Date().getFullYear()} | Documentation Distributed under <a href="https://creativecommons.org/licenses/by/4.0">CC-BY-4.0</a> </strong> <strong>| Powered by <a href="https://www.netlify.com">Netlify</a></strong>
        <br />
        <br />
        The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our <a href="https://www.linuxfoundation.org/trademark-usage/">Trademark Usage</a> page.
        <br />
        <a href="https://www.linuxfoundation.org/privacy/">Privacy Policy</a> and <a href="https://www.linuxfoundation.org/terms/">Terms of Use</a>.
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
        docs: false,
        gtag: {
          trackingID: "G-MK932R9NMD",
          anonymizeIP: false,
        },
        blog: {
          showReadingTime: true,
          editUrl: "https://github.com/Project-HAMi/website/tree/master/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
