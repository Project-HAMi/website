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
import styles from "./EventLanding.module.css";

function pick(locale, obj) {
  return locale === "zh" && obj.zh ? obj.zh : obj.en;
}

function utm(url, slug) {
  const prefix = url.includes("?") ? "&" : "?";
  return `${url}${prefix}utm_source=${slug}&utm_medium=event-landing&utm_campaign=${slug}`;
}

const DEFAULTS = {
  discordUrl: "https://discord.gg/Nwt3jVVpnT",
  githubUrl: "https://github.com/Project-HAMi/HAMi",
};

function dateFmt(locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDate(dateStr, locale) {
  return dateFmt(locale).format(new Date(dateStr));
}

function formatDateRange(startStr, endStr, locale) {
  return dateFmt(locale).formatRange(new Date(startStr), new Date(endStr));
}

export default function EventLanding({ event }) {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === "zh";
  const locale = i18n.currentLocale;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          {event.banner && (
            <img
              src={useBaseUrl(event.banner)}
              alt={pick(locale, event.title)}
              className={styles.banner}
            />
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
        </div>
      </section>

      {event.caseStudy && (
        <section className={styles.caseStudySection}>
          <div className="container">
            <div className={`hami-section-card ${styles.caseStudyCard}`}>
              <h2 className={styles.sectionTitle}>{isZh ? "相关案例" : "Related Case Study"}</h2>
              <div className={styles.caseStudyBody}>
                <div className={styles.caseStudyCompany}>
                  {pick(locale, {
                    en: event.caseStudy.company,
                    zh: event.caseStudy.companyZh || event.caseStudy.company,
                  })}
                </div>
                <ul className={styles.highlights}>
                  {event.caseStudy.highlights.map((h, i) => (
                    <li key={i}>{pick(locale, h)}</li>
                  ))}
                </ul>
                <a
                  href={utm(event.caseStudy.url, event.slug)}
                  className={styles.caseStudyLink}
                  target="_blank"
                  rel="noopener"
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
                href={
                  event.cta?.discordUrl
                    ? event.cta.discordUrl
                    : utm(DEFAULTS.discordUrl, event.slug)
                }
                className="button button--primary button--lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faDiscord} className={styles.btnIcon} />
                Discord
              </a>
              <a
                href={
                  event.cta?.githubUrl ? event.cta.githubUrl : utm(DEFAULTS.githubUrl, event.slug)
                }
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
  );
}
