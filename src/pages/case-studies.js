import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import caseStudies from '../data/caseStudies';
import styles from './case-studies.module.css';

function formatDate(date, locale) {
  const language = locale === 'zh' ? 'zh-CN' : 'en-US';
  return new Date(date).toLocaleDateString(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CaseStudiesPage() {
  const {i18n} = useDocusaurusContext();
  const isZh = i18n.currentLocale === 'zh';
  const t = (item) => (isZh ? item.zh : item.en);

  return (
    <Layout
      title={isZh ? 'HAMi 用户案例' : 'HAMi Case Studies'}
      description={
        isZh
          ? '来自 CNCF 生态的真实落地案例，展示组织如何借助 HAMi 提升 GPU 利用率并扩展 AI 基础设施。'
          : 'Real-world adoption stories from the CNCF ecosystem. Each case study highlights how organizations use HAMi to improve GPU utilization and scale AI infrastructure.'
      }>
      <main className="container margin-top--lg margin-bottom--xl">
        <header className={styles.header}>
          <h1>{isZh ? '案例研究' : 'Case Studies'}</h1>
          <p className={styles.lead}>
            {isZh
              ? '来自 CNCF 生态的真实落地案例。每篇案例展示了组织如何借助 HAMi 提升 GPU 利用率并扩展 AI 基础设施。'
              : 'Real-world adoption stories from the CNCF ecosystem. Each case study highlights how organizations use HAMi to improve GPU utilization and scale AI infrastructure.'}
          </p>
        </header>

        <section className={styles.grid}>
          {caseStudies.map((item) => (
            <article key={item.name} className={`hami-section-card ${styles.card}`}>
              <div className={styles.top}>
                <div className={styles.logoBox}>
                  <img className={styles.logo} src={useBaseUrl(item.logo)} alt={item.name} loading="lazy" />
                </div>
                <span className={styles.meta}>
                  {isZh ? '发布日期' : 'Published'}: {formatDate(item.publishedAt, i18n.currentLocale)}
                </span>
              </div>

              <h2 className={styles.title}>{item.name}</h2>
              <p className={styles.summary}>{t(item.summary)}</p>
              <p className={styles.metric}>{t(item.metric)}</p>

              <ul className={styles.highlightList}>
                {item.highlights.map((point, idx) => (
                  <li key={`${item.name}-highlight-${idx}`}>{t(point)}</li>
                ))}
              </ul>

              <div className={styles.footer}>
                <a className={styles.link} href={item.url} target="_blank" rel="noopener noreferrer">
                  {isZh ? '查看 CNCF 原文' : 'Read on CNCF'} →
                </a>
              </div>
            </article>
          ))}
        </section>
      </main>
    </Layout>
  );
}
