const { themes } = require("prism-react-renderer");
const lightTheme = themes.github;
const darkTheme = themes.dracula;
const defaultLocale = "en";
const siteUrl = (process.env.DOCUSAURUS_SITE_URL || "https://project-hami.io").replace(/\/$/, "");
const githubEditBaseUrl = "https://github.com/Project-HAMi/website/edit/master/";

function getDocEditUrl(versionDocsDirPath, docPath) {
  return `${githubEditBaseUrl}${[versionDocsDirPath, docPath].filter(Boolean).join("/")}`;
}

async function localizedBlogPlugin(context, opts) {
  const p = await require("@docusaurus/plugin-content-blog").default(context, opts);
  const orig = p.postBuild?.bind(p);
  p.postBuild = async function (params) {
    await orig?.(params);
    if (params.i18n.currentLocale !== "zh") return;
    const fs = require("fs");
    const { join } = require("path");
    const dir = join(params.outDir, "blog");
    for (const f of ["rss.xml", "atom.xml"]) {
      const fp = join(dir, f);
      if (!fs.existsSync(fp)) continue;
      fs.writeFileSync(
        fp,
        fs
          .readFileSync(fp, "utf8")
          .replace("HAMi Blog", "HAMi 博客")
          .replace("Latest news and updates from the HAMi project", "HAMi 项目的最新资讯"),
      );
    }
  };
  return p;
}
localizedBlogPlugin.validateOptions = require("@docusaurus/plugin-content-blog").validateOptions;

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: "HAMi",
  tagline: "Heterogeneous AI Computing Virtualization Middleware",
  url: siteUrl,
  baseUrl: "/",
  onBrokenLinks: "throw",
  trailingSlash: false,

  // Performance optimization: Enable fast build mode and v4 future flags
  future: {
    v4: {
      removeLegacyPostBuildHeadAttribute: true,
    },
    faster: {
      swcJsLoader: true,
      ssgWorkerThreads: true,
    },
  },
  customFields: {
    defaultOgImage: "/img/hami-graph-color.png",
  },
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },
  organizationName: "Project-HAMi",
  projectName: "website",
  favicon: "img/logo.svg",
  clientModules: [
    require.resolve("./src/client/imageFigureNumber.js"),
    require.resolve("./src/client/webmcp.js"),
  ],
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
      localizedBlogPlugin,
      {
        showReadingTime: true,
        editUrl: "https://github.com/Project-HAMi/website/tree/master/",
        feedOptions: {
          type: ["rss", "atom"],
          title: "HAMi Blog",
          description: "Latest news and updates from the HAMi project",
          copyright: `Copyright ${new Date().getFullYear()} HAMi Authors`,
        },
      },
    ],
    [
      "./src/plugins/docs/index.js",
      {
        sidebarPath: require.resolve("./sidebars.js"),
        editUrl: function ({ versionDocsDirPath, docPath }) {
          return getDocEditUrl(versionDocsDirPath, docPath);
        },
        showLastUpdateAuthor: false,
        showLastUpdateTime: true,
        includeCurrentVersion: true,
        // Performance optimization: Disable number prefix parser
        numberPrefixParser: false,
        // Performance optimization: Disable breadcrumbs for performance
        breadcrumbs: false,
      },
    ],
    [
      "./src/plugins/docs/index.js",
      {
        id: "tutorials",
        path: "tutorials",
        routeBasePath: "tutorials",
        sidebarPath: require.resolve("./sidebars-tutorials.js"),
        editUrl: function ({ versionDocsDirPath, docPath }) {
          return getDocEditUrl(versionDocsDirPath, docPath);
        },
        showLastUpdateTime: true,
        numberPrefixParser: false,
        breadcrumbs: false,
      },
    ],
    [
      "./src/plugins/changelog/index.js",
      {
        blogTitle: "HAMi Changelog",
        blogDescription: "Keep yourself up-to-date about new features in every release",
        blogSidebarCount: "ALL",
        blogSidebarTitle: "Changelog",
        routeBasePath: "/changelog",
        showReadingTime: false,
        postsPerPage: 20,
        archiveBasePath: null,
        authorsMapPath: "authors.json",
        onInlineAuthors: "warn",
      },
    ],
    [
      "./src/plugins/events/index.js",
      {
        sources: [
          {
            name: "Community Call",
            icsUrl:
              "https://calendar.google.com/calendar/ical/4eef0c8621ddcb873a7e4be9cf487db9d2278de173451abc78dfbc988c7cad45%40group.calendar.google.com/public/basic.ics",
          },
        ],
      },
    ],
  ],
  themes: [
    "@docusaurus/theme-mermaid",
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: ["/docs", "/zh/docs", "/tutorials", "/zh/tutorials"],
        language: ["en", "zh"],
        hashed: "filename",
        docsPluginIdForPreferredVersion: "default",
        searchContextByPaths: ["docs", "zh/docs", "tutorials", "zh/tutorials"],
        useAllContextsWithNoSearchContext: true,
        explicitSearchResultPath: true,
        // Performance optimization: Limit search result snippets
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
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
      id: "kubecon_japan_2026",
      content: "kubecon_japan_2026",
      backgroundColor: "#20232a",
      textColor: "#ffffff",
      isCloseable: true,
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
          to: "/tutorials",
          activeBasePath: "tutorials",
          label: "Tutorials",
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
          to: "/events",
          activeBasePath: "events",
          label: "Events",
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
          to: "/changelog",
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
              label: "Concepts",
              to: "/docs/core-concepts/gpu-virtualization",
            },
            {
              label: "Quick Start",
              to: "/docs/get-started/deploy-with-helm",
            },
            {
              label: "Tutorials",
              to: "/tutorials",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              href: "https://discord.gg/Amhy7XmbNq",
            },
            {
              label: "Slack (#hami-dev)",
              href: "https://cloud-native.slack.com/archives/C07T10BU4R2/",
            },
            {
              label: "WeChat Group",
              href: "/community?wechat=group",
            },
          ],
        },
        {
          title: "Follow Us",
          items: [
            {
              label: "WeChat Official Account",
              href: "/community?wechat=official",
            },
            {
              label: "LinkedIn",
              href: "https://www.linkedin.com/company/project-hami-io/",
            },
            {
              label: "X",
              href: "https://x.com/HAMiProject",
            },
          ],
        },
      ],
      copyright: `
        <br />
        <strong>© HAMi Authors ${new Date().getFullYear()} | Documentation Distributed under <a href="https://creativecommons.org/licenses/by/4.0">CC-BY-4.0</a> </strong> <strong>| Powered by <a href="https://www.netlify.com">Netlify</a></strong>
        <br />
        <br />
        Copyright © HAMi a Series of LF Projects, LLC
        <br />
        For website terms of use, trademark policy and other project policies please see <a href="https://lfprojects.org/policies/">lfprojects.org/policies/</a>.
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
          anonymizeIP: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
