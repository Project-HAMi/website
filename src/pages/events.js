import { useState, useMemo } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useIsBrowser from "@docusaurus/useIsBrowser";
import { usePluginData } from "@docusaurus/useGlobalData";
import { formatDay, formatWeekday, formatFullDate, formatTime } from "../utils/date";
import styles from "./events.module.css";

const DAYS = 14;

// en-CA uses YYYY-MM-DD format in local timezone (vs toISOString which is UTC)
const dateKey = (d) => d.toLocaleDateString("en-CA");

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function EventsPage() {
  const isBrowser = useIsBrowser();
  const { i18n } = useDocusaurusContext();
  const pluginData = usePluginData("plugin-events");
  const events = pluginData?.events || [];
  const isZh = i18n.currentLocale === "zh";
  const locale = i18n.currentLocale;

  const [activeCategory, setActiveCategory] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = startOfDay(new Date());
  const baseSunday = new Date(today);
  baseSunday.setDate(today.getDate() - today.getDay());
  const sunday = new Date(baseSunday);
  sunday.setDate(sunday.getDate() + weekOffset * DAYS);
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const rangeEnd = new Date(sunday);
  rangeEnd.setDate(rangeEnd.getDate() + DAYS);

  const categories = useMemo(() => {
    const set = new Set();
    if (events) events.forEach((e) => e.categories.forEach((c) => set.add(c)));
    return [...set].sort();
  }, [events]);

  const filtered = useMemo(() => {
    if (!events) return [];
    if (!activeCategory) return events;
    return events.filter((e) => e.categories.includes(activeCategory));
  }, [events, activeCategory]);

  const eventsByDay = useMemo(() => {
    const map = {};
    days.forEach((d) => {
      map[dateKey(d)] = [];
    });
    filtered.forEach((e) => {
      const start = new Date(e.start);
      if (start >= rangeEnd) return;
      for (let i = 0; i < DAYS; i++) {
        if (sameDay(start, days[i])) {
          map[dateKey(days[i])].push(e);
          break;
        }
      }
    });
    return map;
  }, [filtered, days, rangeEnd]);

  const daysWithEvents = useMemo(
    () => days.filter((d) => (eventsByDay[dateKey(d)] || []).length > 0),
    [days, eventsByDay],
  );

  const formatDateFull = (d) => formatFullDate(d, locale);

  return (
    <Layout
      title={isZh ? "活动" : "Events"}
      description={
        isZh
          ? "HAMi 社区活动、会议和发布日程。"
          : "HAMi community events, meetings, and release schedule."
      }
    >
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <h1 className={styles.title}>{isZh ? "活动" : "Events"}</h1>
            <p className={styles.subtitle}>
              {isZh ? "未来两周概览" : "View the next two weeks at a glance"}
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            {isBrowser && (
              <>
                <div className={styles.toolbar}>
                  {categories.length > 0 && (
                    <div className={styles.filters}>
                      <button
                        className={`${styles.filterPill} ${activeCategory === null ? styles.filterPillActive : ""}`}
                        onClick={() => setActiveCategory(null)}
                      >
                        {isZh ? "全部" : "All"}
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          className={`${styles.filterPill} ${activeCategory === cat ? styles.filterPillActive : ""}`}
                          onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={styles.nav}>
                    <button
                      className={styles.navArrow}
                      onClick={() => setWeekOffset((o) => o - 1)}
                      disabled={weekOffset <= 0}
                      title={isZh ? "前两周" : "Previous two weeks"}
                      aria-label={isZh ? "前两周" : "Previous two weeks"}
                    >
                      ←
                    </button>
                    <button
                      className={styles.navToday}
                      onClick={() => setWeekOffset(0)}
                      disabled={weekOffset === 0}
                      aria-label={isZh ? "回到今天" : "Back to today"}
                    >
                      {isZh ? "今天" : "Today"}
                    </button>
                    <button
                      className={styles.navArrow}
                      onClick={() => setWeekOffset((o) => o + 1)}
                      title={isZh ? "后两周" : "Next two weeks"}
                      aria-label={isZh ? "后两周" : "Next two weeks"}
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className={styles.cardGrid}>
                  {days.map((d) => {
                    const key = dateKey(d);
                    const dayEvents = eventsByDay[key] || [];
                    const isToday = sameDay(d, today);
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <div
                        key={key}
                        className={`${styles.dayCard} ${!hasEvents ? styles.dayCardEmpty : ""} ${isToday ? styles.dayCardToday : ""}`}
                      >
                        <span className={styles.dayWeekday}>{formatWeekday(d, locale)}</span>
                        <span className={styles.dayDate}>{formatDay(d, locale)}</span>
                        {hasEvents && <span className={styles.dayDot} />}
                      </div>
                    );
                  })}
                </div>

                {daysWithEvents.length > 0 && (
                  <div className={styles.agenda}>
                    <h2 className={styles.agendaTitle}>{isZh ? "日程" : "Agenda"}</h2>
                    {daysWithEvents.map((d) => {
                      const key = dateKey(d);
                      const dayEvents = eventsByDay[key] || [];

                      return (
                        <div key={key} className={styles.agendaDay}>
                          <div className={styles.agendaDayLabel}>
                            <strong>{formatDateFull(d)}</strong>
                          </div>
                          <div className={styles.agendaEvents}>
                            {dayEvents.map((ev) => (
                              <div key={`${ev.start}-${ev.summary}`} className={styles.agendaEvent}>
                                <span className={styles.agendaTime}>
                                  {formatTime(ev.start, locale)}
                                  {ev.end ? ` - ${formatTime(ev.end, locale)}` : ""}
                                </span>
                                <div>
                                  <span className={styles.agendaSummary}>{ev.summary}</span>
                                  {ev.location && (
                                    <span className={styles.agendaLocation}>
                                      {" - "}
                                      {/^https?:\/\//.test(ev.location) ? (
                                        <a
                                          href={ev.location}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {ev.location}
                                        </a>
                                      ) : (
                                        ev.location
                                      )}
                                    </span>
                                  )}
                                  {ev.categories.length > 0 && (
                                    <span className={styles.agendaTags}>
                                      {ev.categories.map((cat) => (
                                        <span key={cat} className={styles.agendaTag}>
                                          {cat}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {daysWithEvents.length === 0 && (
                  <p className={styles.emptyNote}>
                    {isZh
                      ? "该时间段暂无活动安排，敬请期待。"
                      : "No events in this period. Check back soon."}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section className={styles.cta}>
          <div className={`container ${styles.ctaInner}`}>
            <h2 className={styles.ctaTitle}>
              {isZh ? "想要主办或参与 HAMi 活动？" : "Want to host or speak at a HAMi event?"}
            </h2>
            <ul className={styles.ctaList}>
              <li>
                {isZh
                  ? "在社区会议上分享你的用例或功能"
                  : "Share your use case or feature at a community meeting"}
              </li>
              <li>{isZh ? "在你所在城市主办线下聚会" : "Host a meetup in your city"}</li>
              <li>
                {isZh
                  ? "为 HAMi 活动提供赞助或场地支持"
                  : "Sponsor or provide venue support for a HAMi event"}
              </li>
            </ul>
            <a
              href="https://discord.gg/Nwt3jVVpnT"
              className="button button--primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {isZh ? "加入 Discord 活动频道" : "Join the events channel on Discord"}
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
}
