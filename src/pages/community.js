import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBilibili, faDiscord, faGithub, faSlack } from '@fortawesome/free-brands-svg-icons';
import { faArrowRight, faCalendarDays, faFileLines, faHandshake, faUsers } from '@fortawesome/free-solid-svg-icons';
import styles from './community.module.css';

function TimeBadge() {
  return (
    <BrowserOnly fallback={<span>Friday 08:00 UTC</span>}>
      {() => {
        const dt = new Date('2025-01-03T08:00:00Z');
        const local = new Intl.DateTimeFormat(undefined, {
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(dt);
        return <span>{local}</span>;
      }}
    </BrowserOnly>
  );
}

export default function CommunityPage() {
  const {i18n} = useDocusaurusContext();
  const isZh = i18n.currentLocale === 'zh';
  const wechatOfficialQr = useBaseUrl('img/community/wechat-official-account-qr.jpg');
  const wechatVideoQr = useBaseUrl('img/community/wechat-video-channel-qr.jpg');
  const wechatAssistantQr = useBaseUrl('img/community/wechat-assistant-qr.jpg');

  return (
    <Layout title={isZh ? 'HAMi 社区' : 'HAMi Community'}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <p className={styles.eyebrow}>{isZh ? '加入 HAMi 生态' : 'Join the HAMi ecosystem'}</p>
            <h1 className={styles.title}>{isZh ? 'HAMi 社区' : 'HAMi Community'}</h1>
            <p className={styles.subtitle}>
              {isZh
                ? '先进入交流渠道，再参加社区会议，最后通过文档、Issue 和代码贡献持续参与。'
                : 'Start with the main channels, join the public meeting, then contribute through docs, issues and code.'}
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.grid}>
              <article className={styles.primaryCard}>
                <div className={styles.cardIcon}><FontAwesomeIcon icon={faUsers} /></div>
                <h2>{isZh ? '第一步：进入社区' : 'Step 1: Join the community'}</h2>
                <p>{isZh ? '如果你是第一次接触 HAMi，这里是最直接的入口。' : 'If this is your first touchpoint with HAMi, start here.'}</p>
                <div className={styles.linkList}>
                  <a href="https://slack.cncf.io/" className={styles.actionLink}>
                    <FontAwesomeIcon icon={faSlack} />
                    <span>{isZh ? '加入 Slack' : 'Join Slack'}</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </a>
                  <a href="https://discord.gg/Amhy7XmbNq" className={styles.actionLink}>
                    <FontAwesomeIcon icon={faDiscord} />
                    <span>{isZh ? '加入 Discord' : 'Join Discord'}</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </a>
                  <a href="https://github.com/Project-HAMi" className={styles.actionLink}>
                    <FontAwesomeIcon icon={faGithub} />
                    <span>{isZh ? '浏览 GitHub 组织' : 'Explore GitHub org'}</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </a>
                  {isZh && (
                    <a href="https://space.bilibili.com/1105878584" className={styles.actionLink}>
                      <FontAwesomeIcon icon={faBilibili} />
                      <span>关注哔哩哔哩</span>
                      <FontAwesomeIcon icon={faArrowRight} />
                    </a>
                  )}
                </div>
              </article>

              <article className={styles.sideCard}>
                <div className={styles.cardIcon}><FontAwesomeIcon icon={faCalendarDays} /></div>
                <h2>{isZh ? '第二步：参加社区会议' : 'Step 2: Join the community meeting'}</h2>
                <p>{isZh ? '固定节奏的公开会议是了解路线图、需求和当前进展的最好方式。' : 'The recurring public meeting is the best way to understand roadmap, requests and current progress.'}</p>
                <div className={styles.meetingMeta}>
                  <div><strong>{isZh ? '频率' : 'Frequency'}:</strong> {isZh ? '每周' : 'Weekly'}</div>
                  <div><strong>UTC:</strong> Friday 08:00</div>
                  <div><strong>{isZh ? '你的本地时间' : 'Your local time'}:</strong> <TimeBadge /></div>
                  <div><strong>{isZh ? '全球入口' : 'Global entry'}:</strong> <a href="https://github.com/Project-HAMi/community">{isZh ? 'GitHub 社区日历' : 'GitHub Community Calendar'}</a></div>
                  <div><strong>{isZh ? '中国备选入口' : 'China-friendly option'}:</strong> <a href="https://meeting.tencent.com/dm/Ntiwq1BICD1P">{isZh ? '腾讯会议' : 'Tencent Meeting'}</a></div>
                  <div><strong>{isZh ? '议程与纪要' : 'Agenda and notes'}:</strong> <a href="https://shorturl.at/S457j">{isZh ? '会议纪要' : 'Meeting Notes'}</a></div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt}>
          <div className="container">
            <div className={styles.grid}>
              <article className={styles.sideCard}>
                <div className={styles.cardIcon}><FontAwesomeIcon icon={faFileLines} /></div>
                <h2>{isZh ? '第三步：获取资料' : 'Step 3: Use the shared resources'}</h2>
                <p>{isZh ? '会议记录、社区仓库和博客可以帮助你快速补齐上下文。' : 'Meeting notes, the community repo and blog posts help you catch up quickly.'}</p>
                <ul className={styles.resourceList}>
                  <li><a href="https://github.com/Project-HAMi/community">{isZh ? '社区仓库' : 'Community repository'}</a></li>
                  <li><a href="https://github.com/Project-HAMi/community">{isZh ? '会议录屏与演示文档' : 'Meeting recordings and slides'}</a></li>
                  <li><a href={isZh ? '/zh/blog' : '/blog'}>{isZh ? '官方与社区文章' : 'Official and community posts'}</a></li>
                </ul>
              </article>

              <article className={styles.primaryCard}>
                <div className={styles.cardIcon}><FontAwesomeIcon icon={faHandshake} /></div>
                <h2>{isZh ? '第四步：开始贡献' : 'Step 4: Start contributing'}</h2>
                <p>{isZh ? '当你准备参与时，直接从贡献指南、治理规则和成长路径进入。' : 'When you are ready to contribute, start from the guide, governance model and contributor ladder.'}</p>
                <div className={styles.linkList}>
                  <a href={isZh ? '/zh/docs/contributor/contributing' : '/docs/contributor/contributing'} className={styles.actionLink}>
                    <span>{isZh ? '贡献指南' : 'Contributing Guide'}</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </a>
                  <a href={isZh ? '/zh/docs/contributor/governance' : '/docs/contributor/governance'} className={styles.actionLink}>
                    <span>{isZh ? '治理模型' : 'Governance'}</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </a>
                  <a href={isZh ? '/zh/docs/contributor/ladder' : '/docs/contributor/ladder'} className={styles.actionLink}>
                    <span>{isZh ? '贡献者成长路径' : 'Contributor Ladder'}</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        {isZh && (
          <section className={styles.section}>
            <div className="container">
              <h2>微信交流群及公众号</h2>
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
