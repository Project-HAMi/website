import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import styles from "./trust.module.css";

const externalProps = {
  target: "_blank",
  rel: "noreferrer",
};

export default function PrivacyPage() {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === "zh";

  return (
    <Layout
      title={isZh ? "隐私" : "Privacy"}
      description={
        isZh
          ? "了解适用于 HAMi 网站的隐私政策和第三方服务。"
          : "Learn about the privacy policies and third-party services relevant to the HAMi website."
      }
    >
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className="container">
            <h1 className={styles.title}>{isZh ? "隐私" : "Privacy"}</h1>
            <p className={styles.subtitle}>
              {isZh
                ? "本页说明 HAMi 网站使用的服务，并指向适用的权威隐私政策。"
                : "This page identifies services used by the HAMi website and points to the authoritative privacy policies."}
            </p>
          </div>
        </header>

        <div className={styles.content}>
          <div className={`container ${styles.contentGrid}`}>
            <div className={styles.main}>
              <section>
                <h2>{isZh ? "LF Projects 隐私政策" : "LF Projects privacy policies"}</h2>
                <p className={styles.notice}>
                  {isZh
                    ? "本页是便于查阅的网站说明，不替代 LF Projects 发布的政策。请以链接中的政策原文为准。"
                    : "This page is a convenient website summary, not a replacement for policies published by LF Projects. The linked policies are authoritative."}
                </p>
                <p>
                  {isZh
                    ? "HAMi 是 LF Projects, LLC 旗下系列项目之一。有关个人信息和遥测数据处理方式的说明，请查阅 LF Projects 的隐私政策与遥测数据政策。"
                    : "HAMi is a Series of LF Projects, LLC. For information about the handling of personal information and telemetry data, consult the LF Projects Privacy Policy and Telemetry Data Policy."}
                </p>
              </section>

              <section>
                <h2>{isZh ? "本网站使用的服务" : "Services used by this website"}</h2>
                <p>
                  {isZh
                    ? "project-hami.io 托管在 Netlify，并使用启用了 IP 匿名化的 Google Analytics 来了解网站的总体使用情况。这些服务可能会根据各自的隐私政策处理浏览器和网络提供的技术信息。"
                    : "project-hami.io is hosted on Netlify and uses Google Analytics with IP anonymization enabled to understand aggregate site usage. These services may process technical information supplied by browsers and networks under their respective privacy policies."}
                </p>
                <p>
                  {isZh
                    ? "网站中的 GitHub Star 按钮会从 GitHub API 获取 HAMi 仓库的公开 Star 数量；如果请求失败，可能会改用 Shields.io。显示的数量会缓存在浏览器本地存储中。"
                    : "The GitHub star button fetches the HAMi repository's public star count from the GitHub API and may fall back to Shields.io if that request fails. The displayed count is cached in browser local storage."}
                </p>
                <p>
                  {isZh
                    ? "本站的文档搜索在浏览器中运行，并使用浏览器本地存储记住语言偏好。HAMi 不要求创建账户即可阅读网站或使用文档搜索。"
                    : "Documentation search runs in the browser, and browser local storage remembers the selected language. HAMi does not require an account to read the website or use documentation search."}
                </p>
              </section>
            </div>

            <aside className={styles.card}>
              <h2>{isZh ? "政策与服务提供商" : "Policies and providers"}</h2>
              <ul className={styles.linkList}>
                <li>
                  <a href="https://lfprojects.org/policies/privacy-policy/" {...externalProps}>
                    {isZh ? "LF Projects 隐私政策" : "LF Projects Privacy Policy"}
                  </a>
                </li>
                <li>
                  <a
                    href="https://lfprojects.org/policies/telemetry-data-policy/"
                    {...externalProps}
                  >
                    {isZh ? "LF Projects 遥测数据政策" : "LF Projects Telemetry Data Policy"}
                  </a>
                </li>
                <li>
                  <a href="https://lfprojects.org/policies/" {...externalProps}>
                    {isZh ? "LF Projects 全部政策" : "All LF Projects policies"}
                  </a>
                </li>
                <li>
                  <a href="https://policies.google.com/privacy" {...externalProps}>
                    {isZh ? "Google 隐私权政策" : "Google Privacy Policy"}
                  </a>
                </li>
                <li>
                  <a href="https://www.netlify.com/privacy/" {...externalProps}>
                    {isZh ? "Netlify 隐私声明" : "Netlify Privacy Statement"}
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                    {...externalProps}
                  >
                    {isZh ? "GitHub 隐私声明" : "GitHub Privacy Statement"}
                  </a>
                </li>
                <li>
                  <a href="https://shields.io/" {...externalProps}>
                    Shields.io
                  </a>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </main>
    </Layout>
  );
}
