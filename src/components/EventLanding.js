import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord, faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faCalendarDays,
  faLocationDot,
  faClock,
  faDoorOpen,
  faFilePdf,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import useBaseUrl from "@docusaurus/useBaseUrl";
import events from "@site/src/data/events";
import { formatDate, formatDateRange } from "@site/src/utils/date";
import { isChinese, pick } from "@site/src/utils/i18n";
import styles from "./EventLanding.module.css";

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

export default function EventLanding({ slug }) {
  const { i18n, siteConfig } = useDocusaurusContext();
  const isZh = isChinese(i18n.currentLocale);
  const locale = i18n.currentLocale;
  const event = events.find((e) => e.slug === slug);
  const bannerUrl = useBaseUrl(event?.banner ?? "");

  if (!event) {
    return (
      <Layout title={isZh ? "未找到活动" : "Event not found"}>
        <main className="container margin-vert--xl">
          <h1>{isZh ? "未找到活动" : "Event not found"}</h1>
        </main>
      </Layout>
    );
  }
  const effectiveEventStatus = event.eventStatus || "EventScheduled";

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
    image: bannerUrl ? `${siteConfig.url}${bannerUrl}` : undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: `https://schema.org/${effectiveEventStatus}`,
    organizer: {
      "@type": "Organization",
      name: "HAMi",
      url: "https://project-hami.io/",
    },
    ...(event.speaker
      ? {
          performer: event.speaker
            .split(",")
            .map((name) => ({ "@type": "Person", name: name.trim() })),
        }
      : {}),
    ...(event.price !== undefined || event.externalUrl
      ? {
          offers: {
            "@type": "Offer",
            url: event.externalUrl || `${siteConfig.url}/events/${event.slug}`,
            price: event.price ?? "0",
            priceCurrency: event.priceCurrency || "USD",
            availability:
              effectiveEventStatus === "EventScheduled"
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
            validFrom: event.offerValidFrom || event.date,
          },
        }
      : {}),
  };

  return (
    <Layout title={pick(locale, event.title)} description={pick(locale, event.description)}>
      {bannerUrl && (
        <Head>
          <meta property="og:image" content={`${siteConfig.url}${bannerUrl}`} />
          <meta name="twitter:image" content={`${siteConfig.url}${bannerUrl}`} />
        </Head>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <Link to="/landing" className={styles.backLink}>
              ← {isZh ? "落地页" : "Landing Pages"}
            </Link>
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
              {event.startTime && (
                <span className={styles.metaItem}>
                  <FontAwesomeIcon icon={faClock} className={styles.metaIcon} />
                  {event.startTime}
                  {event.endTime ? ` - ${event.endTime}` : ""}
                  {event.timeZone ? ` ${event.timeZone}` : ""}
                </span>
              )}
              {event.room && (
                <span className={styles.metaItem}>
                  <FontAwesomeIcon icon={faDoorOpen} className={styles.metaIcon} />
                  {event.room}
                </span>
              )}
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
                    href={event.caseStudy.url}
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
                        href={event.resources[r.key].url}
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
                  href={event.cta?.discordUrl || utm(DEFAULTS.discordUrl, event.slug)}
                  className="button button--primary button--lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FontAwesomeIcon icon={faDiscord} className={styles.btnIcon} />
                  Discord
                </a>
                <a
                  href={event.cta?.githubUrl || utm(DEFAULTS.githubUrl, event.slug)}
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
        <section className={styles.moreEvents}>
          <div className="container">
            <Link to="/events" className={styles.backLink}>
              ← {isZh ? "活动日历" : "Events Calendar"}
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
