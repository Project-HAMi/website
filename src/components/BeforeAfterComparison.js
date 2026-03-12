import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './BeforeAfterComparison.module.css';

const workloads = [
  {
    key: 'a',
    tone: 'alpha',
    name: 'Pod A',
    slice: { en: '0.3 GPU slice', zh: '0.3 GPU 切片' },
    quota: { en: 'memory 30% · compute 25%', zh: '显存 30% · 算力 25%' },
  },
  {
    key: 'b',
    tone: 'beta',
    name: 'Pod B',
    slice: { en: '0.25 GPU slice', zh: '0.25 GPU 切片' },
    quota: { en: 'memory 25% · compute 20%', zh: '显存 25% · 算力 20%' },
  },
  {
    key: 'c',
    tone: 'gamma',
    name: 'Pod C',
    slice: { en: '0.2 GPU slice', zh: '0.2 GPU 切片' },
    quota: { en: 'memory 20% · compute 15%', zh: '显存 20% · 算力 15%' },
  },
];

const comparisonContent = {
  title: { en: 'Before and After Using HAMi', zh: '使用 HAMi 前后对比' },
  subtitle: {
    en: 'Compare traditional whole-GPU allocation with HAMi GPU sharing under the same workloads.',
    zh: '相同工作负载下，对比传统整卡独占与 HAMi GPU 共享后的资源利用率变化。',
  },
  inputLabel: { en: 'Example Workloads', zh: '示例工作负载' },
  beforeTitle: { en: 'Without HAMi', zh: '未使用 HAMi' },
  beforeSubtitle: { en: 'Whole GPU allocation', zh: '整卡独占' },
  afterTitle: { en: 'With HAMi', zh: '使用 HAMi' },
  afterSubtitle: { en: 'GPU slicing and sharing', zh: '切分共享' },
  transformLabel: {
    en: 'GPU virtualization & sharing',
    zh: 'GPU 虚拟化与共享',
  },
};

const comparisonPanels = {
  before: {
    caption: {
      en: 'Whole GPU allocation · low utilization',
      zh: '整卡独占 · 低利用率',
    },
    gpus: [
      { key: 'gpu0', label: 'GPU 0', pod: 'Pod A', fill: 30, utilization: '30%' },
      { key: 'gpu1', label: 'GPU 1', pod: 'Pod B', fill: 25, utilization: '25%' },
      { key: 'gpu2', label: 'GPU 2', pod: 'Pod C', fill: 20, utilization: '20%' },
    ],
    metrics: {
      gpu: { en: 'Occupied GPUs', zh: '占用 GPU' },
      utilization: { en: 'GPU utilization', zh: 'GPU 利用率' },
      capacity: { en: 'Fragmentation', zh: '碎片化' },
      values: {
        gpu: '3',
        utilization: '25-30%',
        capacity: { en: 'High', zh: '高' },
      },
    },
  },
  after: {
    caption: {
      en: 'GPU slicing & sharing · higher utilization',
      zh: '切分共享 · 更高利用率',
    },
    gpus: [
      { key: 'gpu0', label: 'GPU 0', pods: ['Pod A', 'Pod B', 'Pod C'], fill: 75, utilization: '75%+' },
      { key: 'gpu1', label: 'GPU 1', pods: [], fill: 0, utilization: '--' },
      { key: 'gpu2', label: 'GPU 2', pods: [], fill: 0, utilization: '--' },
    ],
    metrics: {
      gpu: { en: 'Occupied GPUs', zh: '占用 GPU' },
      utilization: { en: 'GPU utilization', zh: 'GPU 利用率' },
      capacity: { en: 'Reusable capacity', zh: '可复用容量' },
      values: {
        gpu: '1',
        utilization: '75%+',
        capacity: { en: 'Higher', zh: '更高' },
      },
    },
  },
};

function localize(isZh, text) {
  return isZh ? text.zh : text.en;
}

function SummaryMetric({ label, value, tone }) {
  return (
    <div className={clsx(styles.metric, styles[`metric_${tone}`])}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GpuColumn({ gpu, isZh, shared = false }) {
  return (
    <article className={clsx(styles.gpuCard, shared && styles.gpuCardShared)}>
      <header className={styles.gpuHeader}>
        <div>
          <h5>{gpu.label}</h5>
          <span>{shared ? (isZh ? '共享' : 'Shared') : (isZh ? '独占' : 'Exclusive')}</span>
        </div>
        <strong>{gpu.utilization}</strong>
      </header>

      <div className={styles.gpuBar} aria-hidden="true">
        <span className={styles.gpuBarFill} style={{ width: `${gpu.fill}%` }} />
      </div>

      {shared ? (
        <div
          className={clsx(
            styles.sliceGroup,
            gpu.pods.length > 0 && styles.sliceGroupSharedPods,
          )}>
          {gpu.pods.length > 0 ? (
            gpu.pods.map((pod, index) => (
              <span key={pod} className={clsx(styles.sliceTag, styles[`sliceTag_${['alpha', 'beta', 'gamma'][index]}`])}>
                {pod}
              </span>
            ))
          ) : (
            <span className={styles.idleTag}>{isZh ? '空闲' : 'Free'}</span>
          )}
        </div>
      ) : (
        <div className={styles.sliceGroup}>
          <span className={clsx(styles.sliceTag, styles[`sliceTag_${gpu.key === 'gpu0' ? 'alpha' : gpu.key === 'gpu1' ? 'beta' : 'gamma'}`])}>
            {gpu.pod}
          </span>
          <span className={styles.idleTag}>{isZh ? '闲置容量' : 'Unused'}</span>
        </div>
      )}
    </article>
  );
}

function ComparisonColumn({ side, isZh }) {
  const panel = comparisonPanels[side];
  const title = side === 'before' ? comparisonContent.beforeTitle : comparisonContent.afterTitle;
  const subtitle = side === 'before' ? comparisonContent.beforeSubtitle : comparisonContent.afterSubtitle;

  return (
    <section className={clsx(styles.compareColumn, styles[`compareColumn_${side}`])}>
      <header className={styles.compareHeader}>
        <span className={styles.compareEyebrow}>{localize(isZh, subtitle)}</span>
        <h4>{localize(isZh, title)}</h4>
      </header>

      <p className={styles.compareCaption}>{localize(isZh, panel.caption)}</p>

      <div className={styles.metricRow}>
        <SummaryMetric
          tone={side}
          label={localize(isZh, panel.metrics.gpu)}
          value={panel.metrics.values.gpu}
        />
        <SummaryMetric
          tone={side}
          label={localize(isZh, panel.metrics.utilization)}
          value={panel.metrics.values.utilization}
        />
        <SummaryMetric
          tone={side}
          label={localize(isZh, panel.metrics.capacity)}
          value={localize(isZh, panel.metrics.values.capacity)}
        />
      </div>

      <div className={styles.gpuRack}>
        {panel.gpus.map((gpu) => (
          <GpuColumn key={`${side}-${gpu.key}`} gpu={gpu} isZh={isZh} shared={side === 'after'} />
        ))}
      </div>
    </section>
  );
}

export default function BeforeAfterComparison({ isZh, showHeader = true }) {
  const hamiLogo = useBaseUrl('img/hami-graph-color.svg');

  return (
    <section
      className={clsx(styles.shell, !showHeader && styles.shellCompact)}
      aria-label={isZh ? '使用 HAMi 前后对比' : 'Before and after using HAMi'}>
      {showHeader && (
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h3>{localize(isZh, comparisonContent.title)}</h3>
            <p>{localize(isZh, comparisonContent.subtitle)}</p>
          </div>
        </header>
      )}

      <section className={styles.inputSection}>
        <div className={styles.inputHeader}>
          <span className={styles.inputLabel}>{localize(isZh, comparisonContent.inputLabel)}</span>
        </div>
        <div className={styles.workloadRow}>
          {workloads.map((workload) => (
            <article key={workload.key} className={clsx(styles.workloadCard, styles[`workloadCard_${workload.tone}`])}>
              <strong>{workload.name}</strong>
              <span>{localize(isZh, workload.slice)}</span>
              <small>{localize(isZh, workload.quota)}</small>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.compareGrid}>
        <ComparisonColumn side="before" isZh={isZh} />
        <div className={styles.compareTransform} aria-hidden="true">
          <span className={clsx(styles.compareTransformArrow, styles.compareTransformArrowLeft)} />
          <div className={styles.compareTransformCore}>
            <img src={hamiLogo} alt="" className={styles.compareTransformLogo} />
            <span className={styles.compareTransformCaption}>
              {localize(isZh, comparisonContent.transformLabel)}
            </span>
          </div>
          <span className={clsx(styles.compareTransformArrow, styles.compareTransformArrowRight)} />
        </div>
        <ComparisonColumn side="after" isZh={isZh} />
      </div>
    </section>
  );
}
