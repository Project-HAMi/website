import React from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import styles from "./trust.module.css";

const externalProps = {
  target: "_blank",
  rel: "noreferrer",
};

export default function AboutPage() {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === "zh";
  const docsPath = isZh ? "/zh/docs" : "/docs";
  const governancePath = `${docsPath}/contributor/governance`;
  const communityPath = isZh ? "/zh/community" : "/community";

  return (
    <Layout
      title={isZh ? "关于 HAMi" : "About HAMi"}
      description={
        isZh
          ? "了解 HAMi 开源项目、治理模式、许可证和官方社区资源。"
          : "Learn about the HAMi open-source project, its governance, licenses, and official community resources."
      }
    >
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className="container">
            <h1 className={styles.title}>{isZh ? "关于 HAMi" : "About HAMi"}</h1>
            <p className={styles.subtitle}>
              {isZh
                ? "HAMi 帮助 Kubernetes 集群共享和调度异构 AI 计算设备。"
                : "HAMi helps Kubernetes clusters share and schedule heterogeneous AI computing devices."}
            </p>
          </div>
        </header>

        <div className={styles.content}>
          <div className={`container ${styles.contentGrid}`}>
            <div className={styles.main}>
              <section>
                <h2>{isZh ? "什么是 HAMi？" : "What is HAMi?"}</h2>
                <p>
                  {isZh
                    ? "HAMi（异构 AI 计算虚拟化中间件）是一个开源项目，为 Kubernetes 中的 GPU、NPU 和其他加速器提供设备共享、细粒度资源分配和设备感知调度能力。项目的前身是 k8s-vGPU-scheduler。"
                    : "HAMi (Heterogeneous AI Computing Virtualization Middleware) is an open-source project that provides device sharing, fine-grained resource allocation, and device-aware scheduling for GPUs, NPUs, and other accelerators in Kubernetes. It was formerly known as k8s-vGPU-scheduler."}
                </p>
                <p>
                  {isZh ? (
                    <>
                      HAMi 是{" "}
                      <a
                        href="https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami"
                        {...externalProps}
                      >
                        CNCF 孵化项目
                      </a>
                      。有关技术能力和使用方式，请从 <Link to={docsPath}>HAMi 文档</Link>开始。
                    </>
                  ) : (
                    <>
                      HAMi is a{" "}
                      <a
                        href="https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami"
                        {...externalProps}
                      >
                        CNCF Incubating project
                      </a>
                      . For technical capabilities and usage, start with the{" "}
                      <Link to={docsPath}>HAMi documentation</Link>.
                    </>
                  )}
                </p>
              </section>

              <section>
                <h2>{isZh ? "开放治理" : "Open governance"}</h2>
                <p>
                  {isZh ? (
                    <>
                      HAMi 由开放社区共同开发。项目角色、决策流程和维护者职责记录在
                      <Link to={governancePath}>治理文档</Link>中，社区参与遵循{" "}
                      <a
                        href="https://github.com/cncf/foundation/blob/main/code-of-conduct.md"
                        {...externalProps}
                      >
                        CNCF 行为准则
                      </a>
                      。你可以通过<Link to={communityPath}>社区页面</Link>加入讨论、会议和贡献。
                    </>
                  ) : (
                    <>
                      HAMi is developed by an open community. Project roles, decision-making, and
                      maintainer responsibilities are documented in the{" "}
                      <Link to={governancePath}>governance guide</Link>, and community participation
                      follows the{" "}
                      <a
                        href="https://github.com/cncf/foundation/blob/main/code-of-conduct.md"
                        {...externalProps}
                      >
                        CNCF Code of Conduct
                      </a>
                      . Visit the <Link to={communityPath}>community page</Link> to join
                      discussions, meetings, and contributions.
                    </>
                  )}
                </p>
              </section>

              <section>
                <h2>{isZh ? "许可证" : "Licenses"}</h2>
                <p>
                  {isZh
                    ? "HAMi 代码和本网站内容使用不同的许可证。HAMi 软件代码采用 Apache License 2.0；本网站及其文档采用 Creative Commons Attribution 4.0 International（CC BY 4.0）。"
                    : "HAMi code and this website's content use different licenses. The HAMi software is licensed under Apache License 2.0; this website and its documentation are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)."}
                </p>
              </section>
            </div>

            <aside className={styles.card}>
              <h2>{isZh ? "官方资源" : "Official resources"}</h2>
              <ul className={styles.linkList}>
                <li>
                  <a href="https://github.com/Project-HAMi/HAMi" {...externalProps}>
                    {isZh ? "HAMi 源代码" : "HAMi source code"}
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
                <li>
                  <Link to={communityPath}>{isZh ? "HAMi 社区" : "HAMi community"}</Link>
                </li>
                <li>
                  <Link to={isZh ? "/zh/changelog" : "/changelog"}>
                    {isZh ? "发布记录" : "Release changelog"}
                  </Link>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </main>
    </Layout>
  );
}
