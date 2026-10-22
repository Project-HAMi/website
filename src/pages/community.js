import React from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl, { useBaseUrlUtils } from "@docusaurus/useBaseUrl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBilibili,
  faDiscord,
  faGithub,
  faLinkedin,
  faSlack,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import {
  faBookOpen,
  faCalendarDays,
  faClipboardList,
  faCodeBranch,
  faFileLines,
  faGlobe,
  faLocationDot,
  faUsers,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import ambassadorRoster from "../data/ambassadors.json";
import styles from "./community.module.css";

const maintainers = [
  {
    name: "Mengxuan Li",
    github: "https://github.com/archlitchi",
    employer: "Dynamia",
    employerZh: "密瓜智能",
    employerUrl: "https://dynamia.ai",
  },
  {
    name: "Xiao Zhang",
    github: "https://github.com/wawa0210",
    employer: "Dynamia",
    employerZh: "密瓜智能",
    employerUrl: "https://dynamia.ai",
  },
  {
    name: "Leibo Wang",
    github: "https://github.com/william-wang",
    employer: "NVIDIA",
    employerZh: "英伟达",
    employerUrl: "https://www.nvidia.com",
  },
  {
    name: "Yu Yin",
    github: "https://github.com/Nimbus318",
    employer: "Dynamia",
    employerZh: "密瓜智能",
    employerUrl: "https://dynamia.ai",
  },
  {
    name: "Shouren Yang",
    github: "https://github.com/Shouren",
    employer: "4Paradigm",
    employerZh: "第四范式",
    employerUrl: "https://www.4paradigm.com",
  },
];

// This local roster adds presentation fields that are not in the canonical
// list. Keep its members and term metadata in sync with ambassadorRoster.source.
const ambassadors = ambassadorRoster.ambassadors;
const ambassadorProgramUrl =
  "https://github.com/Project-HAMi/community/blob/main/ambassador-program.md";

function getGitHubUsername(profileUrl) {
  return profileUrl.replace("https://github.com/", "").replace(/\/$/, "");
}

function pickLocalized(locale, textObj) {
  return locale === "zh" ? textObj.zh : textObj.en;
}

export default function CommunityPage() {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === "zh";
  // The survey form is region-specific: Feishu for zh, Google Forms for everyone else.
  const surveyUrl = isZh
    ? "https://dynamia-ai.feishu.cn/share/base/form/shrcnI1cfFqgx3jWQ76U3HUhwhQ"
    : "https://forms.gle/CTXZmG1WUgE9vPBm8";
  const wechatOfficialQr = useBaseUrl("img/community/wechat-official-account-qr.jpg");
  const wechatVideoQr = useBaseUrl("img/community/wechat-video-channel-qr.jpg");
  const wechatAssistantQr = useBaseUrl("img/community/wechat-assistant-qr.jpg");
  const { withBaseUrl } = useBaseUrlUtils();
  const cardConfig = [
    {
      key: "join",
      title: { en: "Join Community", zh: "加入社区" },
      items: [
        {
          label: { en: "Discord (recommended)", zh: "Discord（推荐）" },
          href: "https://discord.gg/Amhy7XmbNq",
          icon: faDiscord,
        },
        {
          label: { en: "Slack (#hami-dev)", zh: "Slack (#hami-dev)" },
          href: "https://cloud-native.slack.com/archives/C07T10BU4R2",
          icon: faSlack,
        },
        {
          label: { en: "GitHub", zh: "GitHub" },
          href: "https://github.com/Project-HAMi",
          icon: faGithub,
        },
        {
          label: { en: "Mailing list", zh: "邮件列表" },
          href: "https://groups.google.com/forum/#!forum/hami-project",
          icon: faFileLines,
        },
        {
          label: { en: "Community Survey", zh: "社区问卷" },
          href: surveyUrl,
          icon: faClipboardList,
          external: true,
        },
      ],
    },
    {
      key: "meeting",
      title: { en: "Community Meeting", zh: "社区会议" },
      meta: isZh
        ? [{ en: "Friday 16:00 UTC+8, weekly", zh: "周五 16:00 UTC+8，每周" }]
        : [{ en: "Wednesday 16:30 UTC+8, biweekly", zh: "周三 16:30 UTC+8，双周" }],
      items: isZh
        ? [
            {
              label: { en: "Meeting notes and agenda", zh: "会议纪要与议程" },
              href: "https://docs.google.com/document/d/1YC6hco03_oXbF9IOUPJ29VWEddmITIKIfSmBX8JtGBw/edit#heading=h.g61sgp7w0d0c",
              icon: faFileLines,
              external: true,
            },
            {
              label: { en: "Meeting link", zh: "会议链接（腾讯会议）" },
              href: "https://meeting.tencent.com/dm/Ntiwq1BICD1P",
              icon: faVideo,
              external: true,
            },
          ]
        : [
            {
              label: { en: "Meeting notes and agenda", zh: "会议纪要与议程" },
              href: "https://docs.google.com/document/d/1YC6hco03_oXbF9IOUPJ29VWEddmITIKIfSmBX8JtGBw/edit#heading=h.g61sgp7w0d0c",
              icon: faFileLines,
              external: true,
            },
            {
              label: { en: "Meeting link", zh: "会议链接" },
              href: "https://zoom-lfx.platform.linuxfoundation.org/meeting/95994137931?password=55b961b5-3e8e-4040-8657-0f2d26511f1d",
              icon: faVideo,
              external: true,
            },
            {
              label: { en: "iCal subscription", zh: "iCal 订阅" },
              href: "https://webcal.prod.itx.linuxfoundation.org/lfx/lfmd9wcrbnW1NXUzPl",
              icon: faCalendarDays,
              external: true,
            },
          ],
    },
    {
      key: "resources",
      title: { en: "Resources", zh: "社区资料" },
      items: [
        {
          label: { en: "Community Repository", zh: "社区仓库" },
          href: "https://github.com/Project-HAMi/community",
          icon: faBookOpen,
        },
        {
          label: { en: "Videos", zh: "视频" },
          href: isZh
            ? "https://space.bilibili.com/1105878584"
            : "https://www.youtube.com/@hami-community",
          icon: isZh ? faBilibili : faYoutube,
        },
        { label: { en: "Blog", zh: "博客" }, href: isZh ? "/zh/blog" : "/blog", icon: faFileLines },
      ],
    },
    {
      key: "contribute",
      title: { en: "Contribute", zh: "开始贡献" },
      items: [
        {
          label: { en: "Contributing Guide", zh: "贡献指南" },
          href: isZh ? "/zh/docs/contributor/contributing" : "/docs/contributor/contributing",
          icon: faCodeBranch,
        },
        {
          label: { en: "Governance", zh: "治理模型" },
          href: isZh ? "/zh/docs/contributor/governance" : "/docs/contributor/governance",
          icon: faFileLines,
        },
        {
          label: { en: "Community Membership", zh: "社区成员说明" },
          href: "https://github.com/Project-HAMi/community/blob/main/community-membership.md",
          icon: faBookOpen,
          external: true,
        },
        {
          label: { en: "Contributors", zh: "贡献者列表" },
          href: "https://github.com/Project-HAMi/HAMi/blob/master/AUTHORS.md",
          icon: faGithub,
          external: true,
        },
      ],
    },
  ];
  return (
    <Layout
      title={isZh ? "HAMi 社区" : "HAMi Community"}
      description={
        isZh
          ? "参与 HAMi 开源社区，通过讨论、会议和贡献推动异构 AI 基础设施的发展。"
          : "Join the HAMi open-source community and advance heterogeneous AI infrastructure through discussions, meetings, and contributions."
      }
    >
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <h1 className={styles.title}>{isZh ? "HAMi 社区" : "HAMi Community"}</h1>
            <p className={styles.subtitle}>
              {isZh
                ? "参与 HAMi 开源社区，通过讨论、会议和贡献推动异构 AI 基础设施的发展。"
                : "Join the HAMi open-source community and advance heterogeneous AI infrastructure through discussions, meetings, and contributions."}
            </p>
            <div className={styles.heroActions}>
              <a
                className="button button--primary"
                href={surveyUrl}
                target="_blank"
                rel="noreferrer"
              >
                {isZh ? "填写社区问卷" : "Take the Community Survey"}
              </a>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.governanceSection}>
              <h2 className={styles.peopleTitle}>{isZh ? "维护者" : "Maintainers"}</h2>
              <p className={styles.governanceIntro}>
                {isZh
                  ? "HAMi 由以下维护者共同推进，负责项目方向、评审与版本发布。"
                  : "HAMi is maintained by the people below, who help guide project direction, reviews, and releases."}
              </p>

              <div className={styles.peopleGrid}>
                {maintainers.map((maintainer) => {
                  const username = getGitHubUsername(maintainer.github);
                  return (
                    <article key={maintainer.github} className={styles.personCard}>
                      <div className={styles.personTop}>
                        <img
                          className={styles.personAvatar}
                          src={`${maintainer.github}.png?size=160`}
                          alt=""
                          loading="lazy"
                        />
                        <div className={styles.personBody}>
                          <h3 className={styles.personName}>{maintainer.name}</h3>
                          <p className={styles.maintainerMeta}>
                            {maintainer.employerUrl ? (
                              <a
                                href={maintainer.employerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.employerLink}
                              >
                                {isZh && maintainer.employerZh
                                  ? maintainer.employerZh
                                  : maintainer.employer}
                              </a>
                            ) : (
                              <span>
                                {isZh && maintainer.employerZh
                                  ? maintainer.employerZh
                                  : maintainer.employer}
                              </span>
                            )}
                            <span className={styles.metaSeparator} aria-hidden="true">
                              •
                            </span>
                            <a
                              href={maintainer.github}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.githubLink}
                            >
                              <FontAwesomeIcon icon={faGithub} />
                              <span>@{username}</span>
                            </a>
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.governanceSection}>
              <h2 className={styles.peopleTitle}>{isZh ? "大使" : "Ambassadors"}</h2>
              <p className={styles.governanceIntro}>
                {isZh
                  ? `当前 ${ambassadorRoster.term.label} 任期的 HAMi 大使通过内容创作、活动组织和社区支持推广项目。`
                  : `HAMi Ambassadors in the current ${ambassadorRoster.term.label} term evangelize the project through content, events, and community support.`}
              </p>
              <a
                href={ambassadorProgramUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.programLink}
              >
                {isZh
                  ? "了解大使计划与申请方式 →"
                  : "Learn about the Ambassador Program and how to apply →"}
              </a>
              <div className={styles.peopleGrid}>
                {ambassadors.map((ambassador) => {
                  const username = getGitHubUsername(ambassador.github);
                  const displayName =
                    isZh && ambassador.nameZh ? ambassador.nameZh : ambassador.name;
                  const displayLocation =
                    isZh && ambassador.locationZh ? ambassador.locationZh : ambassador.location;
                  return (
                    <article key={ambassador.github} className={styles.personCard}>
                      <div className={`${styles.personTop} ${styles.ambassadorTop}`}>
                        <img
                          className={`${styles.personAvatar} ${styles.ambassadorAvatar}`}
                          src={withBaseUrl(ambassador.avatar)}
                          alt=""
                          loading="lazy"
                        />
                        <div className={styles.personBody}>
                          <h3 className={styles.personName}>{displayName}</h3>
                          <div className={styles.ambassadorMetaRow}>
                            {displayLocation && (
                              <span className={styles.ambassadorLocation}>
                                <FontAwesomeIcon icon={faLocationDot} aria-hidden="true" />
                                <span>{displayLocation}</span>
                              </span>
                            )}
                            <div className={styles.ambassadorLinks}>
                              <a
                                href={ambassador.github}
                                target="_blank"
                                rel="noreferrer"
                                className={`${styles.ambassadorLink} ${styles.ambassadorGithubLink}`}
                              >
                                <FontAwesomeIcon icon={faGithub} aria-hidden="true" />
                                <span>@{username}</span>
                              </a>
                              {ambassador.linkedin && (
                                <a
                                  href={ambassador.linkedin}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`${styles.ambassadorLink} ${styles.ambassadorIconLink}`}
                                  aria-label={
                                    isZh
                                      ? `${displayName} 的 LinkedIn`
                                      : `${displayName}'s LinkedIn profile`
                                  }
                                  title="LinkedIn"
                                >
                                  <FontAwesomeIcon icon={faLinkedin} aria-hidden="true" />
                                </a>
                              )}
                              {ambassador.website && (
                                <a
                                  href={ambassador.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`${styles.ambassadorLink} ${styles.ambassadorIconLink}`}
                                  aria-label={
                                    isZh
                                      ? `${displayName} 的个人主页`
                                      : `${displayName}'s personal website`
                                  }
                                  title={isZh ? "个人主页" : "Website"}
                                >
                                  <FontAwesomeIcon icon={faGlobe} aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.entrySection}>
          <div className="container">
            <h2 className={styles.entryTitle}>{isZh ? "社区入口" : "Community Dashboard"}</h2>
            <p className={styles.sectionIntro}>
              {isZh
                ? "从交流渠道、例会和资料入口快速开始参与社区。"
                : "Start quickly through chat channels, weekly meetings, and shared resources."}
            </p>
            <div className={styles.dashboardGrid}>
              {cardConfig.map((card) => (
                <article key={card.key} className={styles.dashboardCard}>
                  <h3>{pickLocalized(i18n.currentLocale, card.title)}</h3>
                  {card.meta && (
                    <div className={styles.meetingMetaRow}>
                      {card.meta.map((meta) => (
                        <span key={meta.en} className={styles.metaBadge}>
                          {pickLocalized(i18n.currentLocale, meta)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.dashboardButtons}>
                    {card.items.map((item) => (
                      <a
                        key={item.label.en}
                        href={item.href}
                        className={styles.dashboardButton}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noreferrer" : undefined}
                      >
                        <FontAwesomeIcon icon={item.icon} />
                        <span>{pickLocalized(i18n.currentLocale, item.label)}</span>
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {isZh && (
          <section className={styles.section}>
            <div className="container">
              <h2>微信交流群及公众号</h2>
              <p className={styles.sectionIntro}>
                通过公众号、视频号和小助手获取中文社区动态并加入微信群。
              </p>
              <div className="community-qr-grid">
                <div className="community-qr-card">
                  <h3>公众号</h3>
                  <img
                    className="community-qr-image"
                    src={wechatOfficialQr}
                    alt="HAMi 微信公众号二维码"
                  />
                  <p>扫码关注 HAMi 公众号，获取社区动态。</p>
                </div>
                <div className="community-qr-card">
                  <h3>视频号</h3>
                  <img className="community-qr-image" src={wechatVideoQr} alt="HAMi 视频号二维码" />
                  <p>扫码关注 HAMi 视频号，查看活动视频。</p>
                </div>
                <div className="community-qr-card">
                  <h3>微信小助手（入群）</h3>
                  <img
                    className="community-qr-image"
                    src={wechatAssistantQr}
                    alt="HAMi 微信小助手二维码"
                  />
                  <p>扫码添加小助手后，会邀请你进入 HAMi 微信群。</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}
