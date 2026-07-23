import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord, faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faCalendarDays,
  faLocationDot,
  faFilePdf,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import useBaseUrl from "@docusaurus/useBaseUrl";
import events from "@site/src/data/events";
import styles from "./EventLanding.module.css";

function isChinese(locale) {
  return locale.startsWith("zh");
}

function pick(locale, obj) {
  return isChinese(locale) && obj.zh ? obj.zh : obj.en;
}

function utm(url, slug) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  u.searchParams.set("utm_source", slug);
  u.searchParams.set("utm_medium", "event-landing");
  u.searchParams.set("utm_campaign", slug);
  return u.toString();
}

const DEFAULTS = {
  discordUrl: "https://discord.gg/Nwt3jVVpnT",
  githubUrl: "https://github.com/Project-HAMi/HAMi",
};

function dateFmt(locale) {
  return new Intl.DateTimeFormat(isChinese(locale) ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDate(dateStr, locale) {
  return dateFmt(locale).format(new Date(dateStr));
}

function formatDateRange(startStr, endStr, locale) {
  const fmt = dateFmt(locale);
  if (typeof fmt.formatRange !== "function") {
    return `${fmt.format(new Date(startStr))} - ${fmt.format(new Date(endStr))}`;
  }
  return fmt.formatRange(new Date(startStr), new Date(endStr));
}

export default function EventLanding({ slug }) {
  const { i18n } = useDocusaurusContext();
  const isZh = isChinese(i18n.currentLocale);
  const locale = i18n.currentLocale;
  const event = events.find((e) => e.slug === slug);

  if (!event) {
    return (
      <Layout title={isZh ? "未找到活动" : "Event not found"}>
        <main className="container margin-vert--xl">
          <h1>{isZh ? "未找到活动" : "Event not found"}</h1>
        </main>
      </Layout>
    );
  }

  const bannerUrl = useBaseUrl(event.banner || "");
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: pick(locale, event.title),
    startDate: event.date,
    endDate: event.endDate || event.date,
    location: {
      "@type": "Place",
      name: pick(locale, event.location),
      ...(event.address && {
        address: { "@type": "PostalAddress", ...event.address },
      }),
    },
    description: pick(locale, event.description),
    image: event.banner ? `https://project-hami.io${event.banner}` : undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  return (
    <Layout
      title={isZh ? event.title.zh : event.title.en}
      description={isZh ? event.description.zh : event.description.en}
      image={event.banner}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            {event.banner && (
              <img src={bannerUrl} alt={pick(locale, event.title)} className={styles.banner} />
            )}
            <h1 className={styles.title}>{pick(locale, event.title)}</h1>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <FontAwesomeIcon icon={faCalendarDays} className={styles.metaIcon} />
                {event.endDate
                  ? formatDateRange(event.date, event.endDate, locale)
                  : formatDate(event.date, locale)}
              </span>
              <span className={styles.metaItem}>
                <FontAwesomeIcon icon={faLocationDot} className={styles.metaIcon} />
                {pick(locale, event.location)}
              </span>
            </div>
            <p className={styles.description}>{pick(locale, event.description)}</p>
            {(event.externalUrl || event.talkUrl) && (
              <div className={styles.heroLinks}>
                {event.externalUrl && (
                  <a
                    href={event.externalUrl}
                    className={styles.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isZh ? "查看活动官网" : "Event Website"} →
                  </a>
                )}
                {event.talkUrl && (
                  <a
                    href={event.talkUrl}
                    className={styles.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isZh ? "查看演讲详情" : "Talk Details"} →
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {event.caseStudy && (
          <section className={styles.caseStudySection}>
            <div className="container">
              <div className={`hami-section-card ${styles.caseStudyCard}`}>
                <h2 className={styles.sectionTitle}>{isZh ? "相关案例" : "Related Case Study"}</h2>
                <div>
                  <div className={styles.caseStudyCompany}>
                    {pick(locale, {
                      en: event.caseStudy.company,
                      zh: event.caseStudy.companyZh || event.caseStudy.company,
                    })}
                  </div>
                  <ul className={styles.highlights}>
                    {event.caseStudy.highlights.map((h) => (
                      <li key={h.en}>{pick(locale, h)}</li>
                    ))}
                  </ul>
                  <a
                    href={utm(event.caseStudy.url, event.slug)}
                    className={styles.caseStudyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isZh ? "查看 CNCF 原文" : "Read on CNCF"} →
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {event.resources && Object.values(event.resources).some((r) => r?.url) && (
          <section className={styles.resources}>
            <div className="container">
              <div className={`hami-section-card ${styles.resourcesCard}`}>
                <h2 className={styles.sectionTitle}>{isZh ? "会议资料" : "Event Resources"}</h2>
                <div className={styles.resourceList}>
                  {[
                    { key: "communityFlyer", icon: faFilePdf },
                    { key: "talkSlides", icon: faFilePdf },
                    { key: "speakerReel", icon: faVideo },
                  ]
                    .filter((r) => event.resources[r.key]?.url)
                    .map((r) => (
                      <a
                        key={r.key}
                        href={utm(event.resources[r.key].url, event.slug)}
                        className={styles.resourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FontAwesomeIcon icon={r.icon} className={styles.resourceIcon} />
                        <span>{pick(locale, event.resources[r.key])}</span>
                      </a>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className={styles.cta}>
          <div className="container">
            <div className={`hami-section-card ${styles.ctaCard}`}>
              <h2 className={styles.ctaTitle}>{isZh ? "加入社区" : "Join the Community"}</h2>
              <p className={styles.ctaText}>
                {isZh
                  ? "参与 HAMi 开源项目，与维护者和社区成员交流。"
                  : "Get involved with the HAMi open-source project. Connect with maintainers and the community."}
              </p>
              <div className={styles.ctaButtons}>
                <a
                  href={utm(event.cta?.discordUrl || DEFAULTS.discordUrl, event.slug)}
                  className="button button--primary button--lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FontAwesomeIcon icon={faDiscord} className={styles.btnIcon} />
                  Discord
                </a>
                <a
                  href={utm(event.cta?.githubUrl || DEFAULTS.githubUrl, event.slug)}
                  className="button button--outline button--lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FontAwesomeIcon icon={faGithub} className={styles.btnIcon} />
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
