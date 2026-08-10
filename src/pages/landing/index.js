import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import events from "@site/src/data/events";
import { formatDate, formatDateRange } from "@site/src/utils/date";
import { isChinese, pick } from "@site/src/utils/i18n";
import styles from "@site/src/components/EventLanding.module.css";

export default function EventLandingList() {
  const { i18n } = useDocusaurusContext();
  const isZh = isChinese(i18n.currentLocale);
  const locale = i18n.currentLocale;

  return (
    <Layout
      title={isZh ? "落地页 - 列表" : "Landing Pages"}
      description={
        isZh
          ? "查看 HAMi 团队的活动落地页，获取演讲详情与社区资料。"
          : "See the events and talks the HAMi team is part of, with slides and community resources."
      }
    >
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <h1 className={styles.title}>{isZh ? "落地页" : "Landing Pages"}</h1>
            <p className={styles.description}>
              {isZh
                ? "查看 HAMi 团队的活动落地页，获取演讲详情与社区资料。"
                : "See the events and talks the HAMi team is part of, with slides and community resources."}
            </p>
            <div className={styles.eventList}>
              {events.map((e) => (
                <Link
                  key={e.slug}
                  to={`/landing/${e.slug}`}
                  className={`hami-section-card ${styles.eventCard}`}
                >
                  <h3 className={styles.eventTitle}>{pick(locale, e.title)}</h3>
                  <p className={styles.eventMeta}>
                    {e.endDate
                      ? formatDateRange(e.date, e.endDate, locale)
                      : formatDate(e.date, locale)}
                    {e.location ? ` - ${pick(locale, e.location)}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
