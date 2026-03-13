import React from 'react';
import clsx from 'clsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './BeforeAfterComparison.module.css';

const copy = {
  title: { en: 'Before and After Using HAMi', zh: '使用 HAMi 前后对比' },
  subtitle: {
    en: 'Same workloads, different GPU efficiency.',
    zh: '相同工作负载，不同 GPU 利用效率。',
  },
  stepRequests: { en: 'Requests', zh: '请求' },
  stepWithout: { en: 'Without HAMi', zh: '未使用 HAMi' },
  stepWith: { en: 'With HAMi', zh: '使用 HAMi' },
  userA: { en: 'User A', zh: '用户 A' },
  userB: { en: 'User B', zh: '用户 B' },
  reqGpu: { en: '2 GPUs', zh: '2 张 GPU' },
  req10g: { en: '10G per GPU', zh: '每卡 10G' },
  req20g: { en: '20G per GPU', zh: '每卡 20G' },
  node: { en: 'Node: 4 x V100 (32G)', zh: '节点：4 x V100 (32G)' },
  wasted: { en: 'Fragmented / Wasted', zh: '碎片化 / 浪费' },
  exclusive: { en: 'Whole GPU occupied', zh: '整卡占用' },
  shared: { en: 'Shared with isolation', zh: '隔离共享' },
  available: { en: 'Available', zh: '可用' },
  summaryLead: {
    en: 'HAMi packs fragmented AI workloads onto fewer GPUs while preserving isolation.',
    zh: 'HAMi 在保障隔离的前提下，将碎片化 AI 负载打包到更少 GPU。',
  },
  summary1: { en: 'GPUs used: 4 → 2', zh: '占用 GPU：4 → 2' },
  summary2: { en: 'Utilization: 50% → 100%', zh: '利用率：50% → 100%' },
  summary3: { en: 'Workloads per GPU: 1 → 2+', zh: '单卡负载数：1 → 2+' },
  metricGpu: { en: 'GPUs Used', zh: '占用 GPU' },
  metricUtil: { en: 'Utilization', zh: '利用率' },
  metricMulti: { en: 'Workloads / GPU', zh: '单卡负载数' },
  metricGpuValue: '4 → 2',
  metricUtilValue: '50% → 100%',
  metricMultiValue: '1 → 2+',
  legendA: { en: 'Workload A', zh: '负载 A' },
  legendB: { en: 'Workload B', zh: '负载 B' },
  legendWaste: { en: 'Wasted', zh: '浪费容量' },
  legendAvail: { en: 'Available', zh: '可用容量' },
};

const requestRows = [
  { key: 'a', tone: 'a', user: copy.userA, mem: copy.req10g, level: 31, gpuCount: 2 },
  { key: 'b', tone: 'b', user: copy.userB, mem: copy.req20g, level: 62, gpuCount: 2 },
];

const withoutRack = [
  { key: 'gpu0', a: 31, b: 0, available: 0 },
  { key: 'gpu1', a: 31, b: 0, available: 0 },
  { key: 'gpu2', a: 0, b: 62, available: 0 },
  { key: 'gpu3', a: 0, b: 62, available: 0 },
];

const withRack = [
  { key: 'gpu0', a: 31, b: 62, available: 7 },
  { key: 'gpu1', a: 31, b: 62, available: 7 },
  { key: 'gpu2', a: 0, b: 0, available: 100 },
  { key: 'gpu3', a: 0, b: 0, available: 100 },
];

function t(isZh, value) {
  return isZh ? value.zh : value.en;
}

function RequestRow({ isZh, row }) {
  return (
    <article className={styles.requestRowItem}>
      <span className={clsx(styles.userIcon, styles[`userIcon_${row.tone}`])} aria-hidden="true">
        <FontAwesomeIcon icon={faUser} />
      </span>
      <div className={styles.requestText}>
        <strong>{t(isZh, row.user)}</strong>
        <span>{t(isZh, copy.reqGpu)}</span>
        <span>{t(isZh, row.mem)}</span>
      </div>
      <div className={styles.requestStrips} aria-hidden="true">
        {Array.from({ length: row.gpuCount }).map((_, i) => (
          <div key={i} className={styles.requestStrip}>
            <span className={clsx(styles.requestStripFill, styles[`requestStripFill_${row.tone}`])} style={{ height: `${row.level}%` }} />
          </div>
        ))}
      </div>
    </article>
  );
}

function GpuCell({ isZh, item, mode }) {
  const isWith = mode === 'with';
  const used = item.a + item.b;
  const wasted = Math.max(0, 100 - used);
  const isFullyAvailable = isWith && item.available === 100;

  return (
    <article className={clsx(styles.gpuCell, isFullyAvailable && styles.gpuCellAvailableOnly)}>
      <div className={styles.gpuMeter}>
        {isWith && item.available > 0 && <span className={styles.availableBlock} style={{ height: `${item.available}%` }} />}
        {item.b > 0 && <span className={styles.workloadBBlock} style={{ height: `${item.b}%` }} />}
        {item.a > 0 && <span className={styles.workloadABlock} style={{ height: `${item.a}%` }} />}
        {!isWith && wasted > 0 && <span className={styles.wastedBlock} style={{ height: `${wasted}%` }} />}
        {isFullyAvailable && <em className={styles.availableText}>{t(isZh, copy.available)}</em>}
      </div>
      <span className={styles.gpuLabel}>{item.key.toUpperCase()}</span>
    </article>
  );
}

function AllocationPanel({ isZh, mode }) {
  const isWith = mode === 'with';
  const rack = isWith ? withRack : withoutRack;
  const logoUrl = useBaseUrl('img/logo.svg');

  return (
    <section className={clsx(styles.allocPanel, isWith ? styles.allocPanelWith : styles.allocPanelWithout)}>
      <header className={styles.allocHead}>
        <div className={styles.allocHeadTitle}>
          {isWith && (
            <img
              src={logoUrl}
              alt="HAMi"
              className={styles.allocHeadLogo}
            />
          )}
          <h4>{isWith ? t(isZh, copy.stepWith) : t(isZh, copy.stepWithout)}</h4>
        </div>
        <span>{t(isZh, copy.node)}</span>
      </header>
      <div className={styles.rackGrid}>
        {rack.map((item) => (
          <GpuCell key={`${mode}-${item.key}`} isZh={isZh} item={item} mode={mode} />
        ))}
      </div>
      <footer className={styles.allocFoot}>
        <span>{isWith ? t(isZh, copy.shared) : t(isZh, copy.exclusive)}</span>
        <span>{isWith ? t(isZh, copy.available) : t(isZh, copy.wasted)}</span>
      </footer>
    </section>
  );
}

function MetricBadge({ label, value }) {
  return (
    <article className={styles.metricBadge}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function BeforeAfterComparison({ isZh, showHeader = true }) {
  return (
    <section className={styles.shell} aria-label={t(isZh, copy.title)}>
      {showHeader && (
        <header className={styles.header}>
          <h3>{t(isZh, copy.title)}</h3>
          <p>{t(isZh, copy.subtitle)}</p>
        </header>
      )}

      <div className={styles.layout}>
        <figure className={styles.diagramCard}>
          <div className={styles.storyRow}>
            <section className={styles.stepRequests}>
              <h4>{t(isZh, copy.stepRequests)}</h4>
              <div className={styles.requestList}>
                {requestRows.map((row) => (
                  <RequestRow key={row.key} isZh={isZh} row={row} />
                ))}
              </div>
            </section>

            <div className={styles.flowLink}>
              <span>{t(isZh, copy.stepWithout)}</span>
              <i aria-hidden="true" />
            </div>

            <AllocationPanel isZh={isZh} mode="without" />

            <div className={styles.flowLink}>
              <span>{t(isZh, copy.stepWith)}</span>
              <i aria-hidden="true" />
            </div>

            <AllocationPanel isZh={isZh} mode="with" />
          </div>

          <div className={styles.legendRow} aria-label={isZh ? '配色图例' : 'Color legend'}>
            <span className={styles.legendItem}><i className={clsx(styles.legendSwatch, styles.legendSwatchA)} aria-hidden="true" />{t(isZh, copy.legendA)}</span>
            <span className={styles.legendItem}><i className={clsx(styles.legendSwatch, styles.legendSwatchB)} aria-hidden="true" />{t(isZh, copy.legendB)}</span>
            <span className={styles.legendItem}><i className={clsx(styles.legendSwatch, styles.legendSwatchWaste)} aria-hidden="true" />{t(isZh, copy.legendWaste)}</span>
            <span className={styles.legendItem}><i className={clsx(styles.legendSwatch, styles.legendSwatchAvail)} aria-hidden="true" />{t(isZh, copy.legendAvail)}</span>
          </div>
        </figure>

        <aside className={styles.summary}>
          <p className={styles.summaryLead}>{t(isZh, copy.summaryLead)}</p>
          <div className={styles.metricsRow}>
            <MetricBadge label={t(isZh, copy.metricGpu)} value={copy.metricGpuValue} />
            <MetricBadge label={t(isZh, copy.metricUtil)} value={copy.metricUtilValue} />
            <MetricBadge label={t(isZh, copy.metricMulti)} value={copy.metricMultiValue} />
          </div>
        </aside>
      </div>
    </section>
  );
}
