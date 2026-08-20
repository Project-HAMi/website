import React from "react";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import JsonLd from "../components/JsonLd";
import { buildWebPageJsonLd } from "../utils/jsonLd";
import styles from "./trust.module.css";

const externalProps = {
  target: "_blank",
  rel: "noopener noreferrer",
};

export default function TermsPage() {
  const { i18n, siteConfig } = useDocusaurusContext();
  const { pathname } = useLocation();
  const isZh = i18n.currentLocale.startsWith("zh");
  const title = isZh ? "使用条款" : "Terms";
  const description = isZh
    ? "查看适用于 HAMi 网站的 LF Projects 使用条款、商标和其他项目政策。"
    : "Find the LF Projects terms of use, trademark policy, and other project policies relevant to the HAMi website.";

  return (
    <Layout title={title} description={description}>
      <JsonLd
        data={buildWebPageJsonLd({
          siteUrl: siteConfig.url,
          name: title,
          description,
          permalink: pathname,
          locale: i18n.currentLocale,
        })}
      />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className="container">
            <h1 className={styles.title}>{isZh ? "使用条款" : "Terms"}</h1>
            <p className={styles.subtitle}>
              {isZh
                ? "HAMi 网站的使用条款和商标规则由 LF Projects 发布。"
                : "Terms for using the HAMi website and rules for project trademarks are published by LF Projects."}
            </p>
          </div>
        </header>

        <div className={styles.content}>
          <div className={`container ${styles.contentGrid}`}>
            <div className={styles.main}>
              <section>
                <h2>{isZh ? "网站使用条款" : "Website terms of use"}</h2>
                <p className={styles.notice}>
                  {isZh
                    ? "本页不复制或修改法律文本。请以 LF Projects 发布的政策原文为准。"
                    : "This page does not reproduce or modify legal text. The policies published by LF Projects are authoritative."}
                </p>
                <p>
                  {isZh
                    ? "HAMi 是 LF Projects, LLC 旗下系列项目之一。访问或使用 project-hami.io 时，请查阅 LF Projects 使用条款以及政策索引中列出的其他适用政策。"
                    : "HAMi is a Series of LF Projects, LLC. When accessing or using project-hami.io, consult the LF Projects Terms of Use and any other applicable policies listed in the policy index."}
                </p>
              </section>

              <section>
                <h2>{isZh ? "名称与商标" : "Names and trademarks"}</h2>
                <p>
                  {isZh
                    ? "HAMi 及相关名称、标志的使用应遵循 LF Projects 商标政策。开源许可证授予的代码或文档使用权并不自动授予商标使用权。"
                    : "Use of HAMi and related names or logos is subject to the LF Projects Trademark Policy. Rights granted by open-source code or documentation licenses do not automatically grant trademark rights."}
                </p>
              </section>

              <section>
                <h2>{isZh ? "项目许可证" : "Project licenses"}</h2>
                <p>
                  {isZh
                    ? "HAMi 软件代码采用 Apache License 2.0。本网站及其文档采用 CC BY 4.0。许可证文本规定了各自材料的复制、修改和分发条件。"
                    : "HAMi software is licensed under Apache License 2.0. This website and its documentation are licensed under CC BY 4.0. The license texts define the conditions for copying, modifying, and distributing their respective materials."}
                </p>
              </section>
            </div>

            <aside className={styles.card}>
              <h2>{isZh ? "权威政策" : "Authoritative policies"}</h2>
              <ul className={styles.linkList}>
                <li>
                  <a href="https://lfprojects.org/policies/terms-of-use/" {...externalProps}>
                    {isZh ? "LF Projects 使用条款" : "LF Projects Terms of Use"}
                  </a>
                </li>
                <li>
                  <a href="https://lfprojects.org/policies/trademark-policy/" {...externalProps}>
                    {isZh ? "LF Projects 商标政策" : "LF Projects Trademark Policy"}
                  </a>
                </li>
                <li>
                  <a href="https://lfprojects.org/policies/" {...externalProps}>
                    {isZh ? "LF Projects 全部政策" : "All LF Projects policies"}
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Project-HAMi/HAMi/blob/master/LICENSE"
                    {...externalProps}
                  >
                    Apache License 2.0
                  </a>
                </li>
                <li>
                  <a href="https://creativecommons.org/licenses/by/4.0/" {...externalProps}>
                    CC BY 4.0
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
