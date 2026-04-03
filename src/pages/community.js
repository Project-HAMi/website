import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBilibili, faDiscord, faGithub, faSlack } from '@fortawesome/free-brands-svg-icons';
import { faBookOpen, faCalendarDays, faCodeBranch, faFileLines, faUsers, faVideo } from '@fortawesome/free-solid-svg-icons';
import styles from './community.module.css';

const maintainers = [
  {
    name: 'Mengxuan Li',
    github: 'https://github.com/archlitchi',
    employer: 'Dynamia',
    employerZh: '密瓜智能',
    employerUrl: 'https://dynamia.ai',
  },
  {
    name: 'Xiao Zhang',
    github: 'https://github.com/wawa0210',
    employer: 'Dynamia',
    employerZh: '密瓜智能',
    employerUrl: 'https://dynamia.ai',
  },
  {
    name: 'Leibo Wang',
    github: 'https://github.com/william-wang',
    employer: 'Nvidia',
    employerZh: '英伟达',
    employerUrl: 'https://www.nvidia.com',
  },
  {
    name: 'Yu Yin',
    github: 'https://github.com/Nimbus318',
    employer: 'Dynamia',
    employerZh: '密瓜智能',
    employerUrl: 'https://dynamia.ai',
  },
  {
    name: 'Shouren Yang',
    github: 'https://github.com/Shouren',
    employer: '4Paradigm',
    employerZh: '第四范式',
    employerUrl: 'https://www.4paradigm.com',
  },
];

function getGitHubUsername(profileUrl) {
  return profileUrl.replace('https://github.com/', '').replace(/\/$/, '');
}

function pickLocalized(locale, textObj) {
  return locale === 'zh' ? textObj.zh : textObj.en;
}

export default function CommunityPage() {
  const {i18n} = useDocusaurusContext();
  const isZh = i18n.currentLocale === 'zh';
  const wechatOfficialQr = useBaseUrl('img/community/wechat-official-account-qr.jpg');
  const wechatVideoQr = useBaseUrl('img/community/wechat-video-channel-qr.jpg');
  const wechatAssistantQr = useBaseUrl('img/community/wechat-assistant-qr.jpg');
  const cardConfig = [
    {
      key: 'join',
      title: { en: 'Join Chat', zh: '加入交流' },
      items: [
        { label: { en: 'Discord', zh: 'Discord' }, href: 'https://discord.gg/Amhy7XmbNq', icon: faDiscord },
        { label: { en: 'Slack (join #hami-dev)', zh: 'Slack（搜索 #hami-dev）' }, href: 'https://slack.cncf.io/', icon: faSlack },
        { label: { en: 'GitHub', zh: 'GitHub' }, href: 'https://github.com/Project-HAMi', icon: faGithub },
        { label: { en: 'Bilibili', zh: 'Bilibili' }, href: 'https://space.bilibili.com/1105878584', icon: faBilibili },
      ],
    },
    {
      key: 'meeting',
      title: { en: 'Weekly Meeting', zh: '每周社区会议' },
      meta: [{ en: 'Friday 08:00 UTC', zh: '周五 08:00 UTC' }],
      items: [
        { label: { en: 'GitHub Calendar', zh: 'GitHub 日历' }, href: 'https://github.com/Project-HAMi/community', icon: faCalendarDays },
        { label: { en: 'Meeting notes and agenda', zh: '会议纪要与议程' }, href: 'https://shorturl.at/S457j', icon: faFileLines, external: true },
        { label: { en: 'Meeting link', zh: '会议链接' }, href: 'https://meeting.tencent.com/dm/Ntiwq1BICD1P', icon: faVideo, external: true },
      ],
    },
    {
      key: 'resources',
      title: { en: 'Resources', zh: '社区资料' },
      items: [
        { label: { en: 'Community Repository', zh: '社区仓库' }, href: 'https://github.com/Project-HAMi/community', icon: faBookOpen },
        { label: { en: 'Meeting Recordings', zh: '会议录屏' }, href: 'https://space.bilibili.com/1105878584', icon: faVideo },
        { label: { en: 'Blog', zh: '博客' }, href: isZh ? '/zh/blog' : '/blog', icon: faFileLines },
      ],
    },
    {
      key: 'contribute',
      title: { en: 'Contribute', zh: '开始贡献' },
      items: [
        { label: { en: 'Contributing Guide', zh: '贡献指南' }, href: isZh ? '/zh/docs/contributor/contributing' : '/docs/contributor/contributing', icon: faCodeBranch },
        { label: { en: 'Governance', zh: '治理模型' }, href: isZh ? '/zh/docs/contributor/governance' : '/docs/contributor/governance', icon: faFileLines },
        { label: { en: 'Community Membership', zh: '社区成员说明' }, href: 'https://github.com/Project-HAMi/community/blob/main/community-membership.md', icon: faBookOpen, external: true },
        { label: { en: 'Contributors', zh: '贡献者列表' }, href: 'https://github.com/Project-HAMi/HAMi/blob/master/AUTHORS.md', icon: faGithub, external: true },
      ],
    },
  ];
  return (
    <Layout title={isZh ? 'HAMi 社区' : 'HAMi Community'}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <h1 className={styles.title}>{isZh ? 'HAMi 社区' : 'HAMi Community'}</h1>
            <p className={styles.subtitle}>
              {isZh
                ? '参与 HAMi 开源社区，通过讨论、会议和贡献推动异构 AI 基础设施的发展。'
                : 'Join the HAMi open-source community and advance heterogeneous AI infrastructure through discussions, meetings, and contributions.'}
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.governanceSection}>
              <h2 className={styles.maintainersTitle}>{isZh ? '维护者' : 'Maintainers'}</h2>
              <p className={styles.governanceIntro}>
                {isZh
                  ? 'HAMi 由以下维护者共同推进，负责项目方向、评审与版本发布。'
                  : 'HAMi is maintained by the people below, who help guide project direction, reviews, and releases.'}
              </p>

              <div className={styles.maintainersGrid}>
                {maintainers.map((maintainer) => {
                  const username = getGitHubUsername(maintainer.github);
                  return (
                    <article key={maintainer.github} className={styles.maintainerCard}>
                      <div className={styles.maintainerTop}>
                        <img
                          className={styles.maintainerAvatar}
                          src={`${maintainer.github}.png?size=160`}
                          alt={`${maintainer.name} GitHub avatar`}
                          loading="lazy"
                        />
                        <div className={styles.maintainerBody}>
                          <h3 className={styles.maintainerName}>{maintainer.name}</h3>
                          <p className={styles.maintainerMeta}>
                            {maintainer.employerUrl ? (
                              <a href={maintainer.employerUrl} target="_blank" rel="noreferrer" className={styles.employerLink}>
                                {isZh && maintainer.employerZh ? maintainer.employerZh : maintainer.employer}
                              </a>
                            ) : (
                              <span>{isZh && maintainer.employerZh ? maintainer.employerZh : maintainer.employer}</span>
                            )}
                            <span className={styles.metaSeparator} aria-hidden="true">•</span>
                            <a href={maintainer.github} target="_blank" rel="noreferrer" className={styles.githubLink}>
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

        <section className={styles.entrySection}>
          <div className="container">
            <h2 className={styles.entryTitle}>{isZh ? '社区入口' : 'Community Dashboard'}</h2>
            <p className={styles.sectionIntro}>
              {isZh
                ? '从交流渠道、例会和资料入口快速开始参与社区。'
                : 'Start quickly through chat channels, weekly meetings, and shared resources.'}
            </p>
            <div className={styles.dashboardGrid}>
              {cardConfig.map((card) => (
                <article key={card.key} className={styles.dashboardCard}>
                  <h3>{pickLocalized(i18n.currentLocale, card.title)}</h3>
                  {card.meta && (
                    <div className={styles.meetingMetaRow}>
                      {card.meta.map((meta) => (
                        <span key={meta.en} className={styles.metaBadge}>{pickLocalized(i18n.currentLocale, meta)}</span>
                      ))}
                    </div>
                  )}
                  <div className={styles.dashboardButtons}>
                    {card.items.map((item) => (
                      <a
                        key={item.label.en}
                        href={item.href}
                        className={styles.dashboardButton}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noreferrer' : undefined}>
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
              <p className={styles.sectionIntro}>通过公众号、视频号和小助手获取中文社区动态并加入微信群。</p>
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
                  <img
                    className="community-qr-image"
                    src={wechatVideoQr}
                    alt="HAMi 视频号二维码"
                  />
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
