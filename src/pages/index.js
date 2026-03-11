import React, { useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingCircleCheck,
  faChartLine,
  faCircleNodes,
  faCubesStacked,
  faGaugeHigh,
  faNetworkWired,
  faPuzzlePiece,
  faShareNodes,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import styles from './styles.module.css';
import ContributorsList from '../components/contributorsList';
import AdoptersList from '../components/adoptersList';
import heroStats from '../data/home/heroStats';
import valueCards from '../data/home/valueCards';
import featureCards from '../data/home/featureCards';

const cardIcons = {
  'network-wired': faNetworkWired,
  'share-nodes': faShareNodes,
  'shield-halved': faShieldHalved,
  'puzzle-piece': faPuzzlePiece,
  'cubes-stacked': faCubesStacked,
  'building-circle-check': faBuildingCircleCheck,
  'gauge-high': faGaugeHigh,
  'chart-line': faChartLine,
};

const fallbackCardIcon = faCircleNodes;
const architectureLayers = [
  {
    key: 'workloads',
    tone: 'workloads',
    icon: faCubesStacked,
    iconType: 'fa',
    title: { en: 'AI Workloads', zh: 'AI 工作负载' },
    items: { en: 'Training • Inference • Batch • Pipelines', zh: '训练 • 推理 • 批处理 • 流水线' },
  },
  {
    key: 'hami',
    tone: 'hami',
    iconType: 'hami',
    title: { en: 'HAMi Platform', zh: 'HAMi 平台' },
    items: { en: 'Virtualization • Sharing • Isolation • Scheduling', zh: '虚拟化 • 共享 • 隔离 • 调度' },
  },
  {
    key: 'accelerators',
    tone: 'accelerators',
    icon: faPuzzlePiece,
    iconType: 'fa',
    title: { en: 'Heterogeneous Accelerators', zh: '异构加速器' },
    items: { en: 'GPU • NPU • MLU • DCU', zh: 'GPU • NPU • MLU • DCU' },
  },
];
const runtimeThemes = [
  { key: 'slicing', icon: 'hami', title: { en: 'GPU slicing & isolation', zh: 'GPU 切分与隔离' } },
  { key: 'scheduling', icon: 'kubernetes', title: { en: 'Heterogeneous scheduling & topology', zh: '异构调度与拓扑策略' } },
];
const runtimeLanes = [
  {
    key: 'control',
    tone: 'control',
    title: { en: 'Control Plane', zh: '控制面' },
    summary: { en: 'Decision path', zh: '决策路径' },
    steps: [
      { key: 'webhook', emphasis: 'secondary', label: { en: 'MutatingWebhook', zh: 'MutatingWebhook' } },
      { key: 'scheduler', emphasis: 'primary', label: { en: 'HAMi Scheduler + Policy/Topology', zh: 'HAMi Scheduler + 策略/拓扑' } },
      { key: 'binding', emphasis: 'primary', label: { en: 'Device binding decision', zh: '设备绑定决策' } },
    ],
  },
  {
    key: 'data',
    tone: 'data',
    title: { en: 'Data Plane', zh: '数据面' },
    summary: { en: 'Enforcement path', zh: '执行路径' },
    steps: [
      { key: 'injection', emphasis: 'primary', label: { en: 'Device Plugin + CDI injection', zh: 'Device Plugin + CDI 注入' } },
      { key: 'isolation', emphasis: 'primary', label: { en: 'HAMi-Core hard isolation (memory/core)', zh: 'HAMi-Core 硬隔离（memory/core）' } },
      { key: 'runtime', emphasis: 'secondary', label: { en: 'Container workloads run', zh: '容器工作负载运行' } },
    ],
  },
];
const compareRequests = [
  { key: 'a', tone: 'alpha', name: 'Pod A', usage: { en: 'mem 30% · core 25%', zh: '显存 30% · 算力 25%' }, cells: 5 },
  { key: 'b', tone: 'beta', name: 'Pod B', usage: { en: 'mem 24% · core 20%', zh: '显存 24% · 算力 20%' }, cells: 4 },
  { key: 'c', tone: 'gamma', name: 'Pod C', usage: { en: 'mem 18% · core 15%', zh: '显存 18% · 算力 15%' }, cells: 3 },
];
const compareScenarios = [
  {
    key: 'before',
    title: { en: 'Without HAMi', zh: '未使用 HAMi' },
    result: { en: 'Whole-GPU allocation', zh: '整卡独占分配' },
    summary: { en: 'Fragmentation, low utilization', zh: '资源碎片化，利用率低' },
    policies: [{ en: 'Single placement path', zh: '单一路径放置' }],
    gpus: [
      { key: 'gpu0', name: 'GPU 0', utilization: '31%', mode: { en: 'exclusive', zh: '独占' }, allocations: [{ tone: 'alpha', cells: 5 }] },
      { key: 'gpu1', name: 'GPU 1', utilization: '25%', mode: { en: 'exclusive', zh: '独占' }, allocations: [{ tone: 'beta', cells: 4 }] },
      { key: 'gpu2', name: 'GPU 2', utilization: '19%', mode: { en: 'exclusive', zh: '独占' }, allocations: [{ tone: 'gamma', cells: 3 }] },
    ],
  },
  {
    key: 'after',
    title: { en: 'With HAMi', zh: '使用 HAMi' },
    result: { en: 'Fine-grained slicing & packing', zh: '细粒度切分与装箱' },
    summary: { en: 'Higher packing, higher utilization', zh: '装箱更紧凑，利用率更高' },
    policies: [{ en: 'Binpack', zh: 'Binpack' }, { en: 'Spread', zh: 'Spread' }, { en: 'Topology-aware', zh: '拓扑感知' }],
    gpus: [
      { key: 'gpu0', name: 'GPU 0', utilization: '75%', mode: { en: 'shared slices', zh: '切片共享' }, allocations: [{ tone: 'alpha', cells: 5 }, { tone: 'beta', cells: 4 }, { tone: 'gamma', cells: 3 }] },
      { key: 'gpu1', name: 'GPU 1', utilization: '0%', mode: { en: 'standby', zh: '空闲' }, allocations: [] },
      { key: 'gpu2', name: 'GPU 2', utilization: '0%', mode: { en: 'standby', zh: '空闲' }, allocations: [] },
    ],
  },
];
const vendorEcosystem = [
  { key: 'ascend', name: 'Huawei Ascend', logo: 'img/contributors/ascend.svg', href: 'https://www.hiascend.com' },
  { key: 'cambricon', name: 'Cambricon', logo: 'img/contributors/cambricon.svg', href: 'https://www.cambricon.com' },
  { key: 'enflame', name: 'Enflame', logo: 'img/contributors/enflame.svg', href: 'https://www.enflame-tech.com' },
  { key: 'hygon', name: 'Hygon', logo: 'img/contributors/hygon.png', href: 'https://www.hygon.cn' },
  { key: 'iluvatar', name: 'Iluvatar', logo: 'img/contributors/iluvatar.png', href: 'https://www.iluvatar.com' },
  { key: 'kunlunxin', name: 'Kunlunxin', logo: 'img/contributors/kunlunxin.jpg', href: 'https://www.kunlunxin.com' },
  { key: 'metax', name: 'Metax', logo: 'img/contributors/metax.png', href: 'https://www.metax-tech.com' },
  { key: 'mthreads', name: 'Mthreads', logo: 'img/contributors/mthread.png', href: 'https://www.mthreads.com' },
  { key: 'nvidia', name: 'NVIDIA', logo: 'img/nvidia.svg', href: 'https://www.nvidia.com' },
];

function pickLocalized(locale, textObj) {
  return locale === 'zh' ? textObj.zh : textObj.en;
}

function buildGpuCells(allocations, capacity = 16) {
  const cells = allocations.flatMap((allocation) =>
    Array.from({ length: allocation.cells }, (_, index) => ({ key: `${allocation.tone}-${index}`, tone: allocation.tone }))
  );
  while (cells.length < capacity) {
    cells.push({ key: `empty-${cells.length}`, tone: 'empty' });
  }
  return cells.slice(0, capacity);
}

export default function Home() {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === 'zh';
  const kubernetesLogo = useBaseUrl('img/kubernetes-logo.svg');
  const hamiLogo = useBaseUrl('img/hami-graph-color.svg');

  /* ── scroll-reveal via IntersectionObserver ── */
  const revealRefs = useRef([]);
  const addRevealRef = useCallback((el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  }, []);

  useEffect(() => {
    const els = revealRefs.current;
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(
              entry.target.dataset.revealScale
                ? styles.revealVisibleScale
                : styles.revealVisible,
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <Layout
      title={isZh ? 'HAMi 异构 AI 计算虚拟化中间件' : 'HAMi - Heterogeneous AI Computing Virtualization Middleware'}
      description={
        isZh
          ? 'HAMi 为 Kubernetes 提供异构 AI 设备共享、隔离与调度能力。'
          : 'HAMi provides Kubernetes-native heterogeneous AI device sharing, isolation and scheduling.'
      }>
      <main>
        <section className={clsx(styles.hero, 'hami-shell-bg')}>
          <div className="container">
            <div className={styles.heroContent}>
              <div>
                <div className={styles.badges}>
                  {heroStats.map((item) => (
                    <span key={item.key} className="hami-pill">
                      <strong>{item.label}:</strong>&nbsp;{item.value}
                    </span>
                  ))}
                </div>
                <h1 className={styles.heroTitle}>
                  {isZh
                    ? '面向异构 AI 基础设施的 Kubernetes 虚拟化中间件'
                    : 'Kubernetes virtualization middleware for heterogeneous AI infrastructure'}
                </h1>
                <p className={styles.heroSubtitle}>
                  {isZh
                    ? 'HAMi 提供资源共享、隔离与调度能力，让 GPU/NPU/MLU 等异构设备在同一平台内高效运行。'
                    : 'HAMi enables sharing, isolation and scheduling for GPU/NPU/MLU resources so mixed accelerators run efficiently on one platform.'}
                </p>
                <div className={styles.heroActions}>
                  <Link className="button button--primary button--lg" to={useBaseUrl('/docs/get-started/deploy-with-helm')}>
                    {isZh ? '快速开始' : 'Quick Start'}
                  </Link>
                  <Link className="button button--outline button--lg" to={useBaseUrl('/community')}>
                    {isZh ? '加入社区' : 'Join Community'}
                  </Link>
                </div>
              </div>
              <div className={styles.heroVisual}>
                  <div className={styles.stackK8sHeader}>
                    <div className={styles.stackK8sBadge} aria-label={isZh ? '运行于 Kubernetes 之上' : 'Runs on Kubernetes'}>
                      <img src={kubernetesLogo} alt="" className={styles.stackK8sBadgeLogo} aria-hidden="true" />
                      <span>{isZh ? '运行于 Kubernetes 之上' : 'Runs on Kubernetes'}</span>
                    </div>
                  </div>
                  <div className={styles.stackWrapper}>
                    <div className={styles.stackDiagram} role="img" aria-label="HAMi architecture overview">
                      {architectureLayers.map((layer, index) => (
                        <React.Fragment key={layer.key}>
                          <article className={clsx(styles.stackLayer, styles[`stackLayer_${layer.tone}`])}>
                            <div className={styles.stackLayerHeader}>
                              <span className={styles.stackLayerIcon} aria-hidden="true">
                                {layer.iconType === 'hami' ? (
                                  <span className={clsx(styles.brandGlyph, styles.brandGlyphHami)} />
                                ) : layer.iconType === 'kubernetes' ? (
                                  <span className={clsx(styles.brandGlyph, styles.brandGlyphKubernetes)} />
                                ) : (
                                  <FontAwesomeIcon icon={layer.icon} />
                                )}
                              </span>
                              <h3 className={styles.stackLayerTitle}>{pickLocalized(i18n.currentLocale, layer.title)}</h3>
                            </div>
                            <p className={styles.stackLayerItems}>{pickLocalized(i18n.currentLocale, layer.items)}</p>
                          </article>
                          {index < architectureLayers.length - 1 && (
                            <div className={styles.stackArrowWrap} aria-hidden="true">
                              <span className={styles.stackArrowLine} />
                              <span className={styles.stackArrow}>↓</span>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <aside className={styles.stackObsCrossCut} aria-label={isZh ? '可观测性与运维（贯穿各层）' : 'Observability & Ops (cross-cutting)'}>
                      <div className={styles.stackObsRail} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className={styles.stackObsCard}>
                        <span className={styles.stackObsIcon} aria-hidden="true">
                          <FontAwesomeIcon icon={faChartLine} />
                        </span>
                        <span className={clsx(styles.stackObsLabel, !isZh && styles.stackObsLabelEn)}>{isZh ? '可观测性与运维' : 'Observability & Ops'}</span>
                      </div>
                    </aside>
                  </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.cncfSection, styles.reveal)}>
          <div className="container">
            <div className={styles.cncfFeature}>
              <div className={styles.cncfFeatureMedia}>
                <img src={useBaseUrl('img/cncf-color.svg')} alt="CNCF logo" className={styles.cncfFeatureLogoLight} />
                <img src={useBaseUrl('img/cncf-white.svg')} alt="CNCF logo" className={styles.cncfFeatureLogoDark} />
              </div>
              <div className={styles.cncfFeatureBody}>
                <span className={styles.cncfEyebrow}>{isZh ? 'CNCF Sandbox 项目' : 'CNCF Sandbox Project'}</span>
                <h2 className={styles.cncfFeatureTitle}>
                  {isZh ? 'HAMi 是 CNCF Sandbox 项目' : 'HAMi is a CNCF Sandbox project'}
                </h2>
                <p className={styles.cncfFeatureText}>
                  {isZh
                    ? '该项目在 CNCF 治理下开放开发，来自全球各地的公司和个人持续为其做出贡献。'
                    : 'The project is developed in the open under CNCF governance, with contributions from a growing global community of companies and individuals.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section ref={addRevealRef} id="why" className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '为什么使用 HAMi' : 'Why HAMi'}</h2>
            <div className={styles.cardGrid}>
              {valueCards.map((card) => {
                const icon = cardIcons[card.icon] ?? fallbackCardIcon;
                return (
                  <article key={card.id} className={clsx(styles.card, 'hami-section-card')}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardIcon} aria-hidden="true">
                        <FontAwesomeIcon icon={icon} />
                      </div>
                      <h3>{pickLocalized(i18n.currentLocale, card.title)}</h3>
                    </div>
                    <p>{pickLocalized(i18n.currentLocale, card.description)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.sectionAlt, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '核心能力' : 'Key Features'}</h2>
            <div className={styles.featureGrid}>
              {featureCards.map((card) => {
                const icon = cardIcons[card.icon] ?? fallbackCardIcon;
                const isK8sNativeCard = card.id === 'k8s-native';
                return (
                  <article key={card.id} className={clsx(styles.featureCard, 'hami-section-card')}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardIcon} aria-hidden="true">
                        {isK8sNativeCard ? (
                          <img src={kubernetesLogo} alt="" className={styles.cardIconImage} />
                        ) : (
                          <FontAwesomeIcon icon={icon} />
                        )}
                      </div>
                      <h3>{pickLocalized(i18n.currentLocale, card.title)}</h3>
                    </div>
                    <p>{pickLocalized(i18n.currentLocale, card.description)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '架构与工作原理' : 'Architecture & How It Works'}</h2>
            <div className={clsx(styles.archIntro, 'hami-section-card')}>
              <p>
                {isZh
                  ? 'HAMi 通过「GPU 虚拟化切分 + 异构资源调度」两条核心链路，在 Kubernetes 中完成从请求到分配再到隔离执行。'
                  : 'HAMi works through two core paths: GPU virtualization/slicing and heterogeneous scheduling from request to isolated execution.'}
              </p>
              <Link className={styles.inlineLink} to={useBaseUrl('/docs/core-concepts/architecture')}>
                {isZh ? '查看完整架构文档 →' : 'View full architecture docs →'}
              </Link>
            </div>
            <article ref={addRevealRef} data-reveal-scale="1" className={clsx(styles.runtimeMechanism, styles.reveal)} role="img" aria-label={isZh ? 'HAMi 运行时机制架构图' : 'HAMi runtime architecture diagram'}>
              <header className={styles.runtimeHeader}>
                <h3>{isZh ? 'HAMi 运行时机制' : 'HAMi Runtime Mechanism'}</h3>
                <div className={styles.runtimeThemeRow}>
                  {runtimeThemes.map((theme) => (
                    <div key={theme.key} className={clsx(styles.runtimeTheme, styles[`runtimeTheme_${theme.key}`])}>
                      <span className={styles.runtimeThemeIcon} aria-hidden="true">
                        {theme.icon === 'hami' ? <img src={hamiLogo} alt="" /> : <img src={kubernetesLogo} alt="" />}
                      </span>
                      <span className={styles.runtimeThemeTitle}>{pickLocalized(i18n.currentLocale, theme.title)}</span>
                    </div>
                  ))}
                </div>
              </header>
              <div className={styles.runtimeEntryStage}>
                <div className={styles.runtimeEntryLabel}>{isZh ? '请求入口 / 运行时接口' : 'Request entry / Runtime interface'}</div>
                <div className={styles.runtimeEntry}>{isZh ? 'PodSpec + Device Plugin / DRA + CDI 运行时' : 'PodSpec + Device Plugin / DRA + CDI runtime'}</div>
              </div>
              <div className={styles.runtimeStageConnector} aria-hidden="true">
                <span className={styles.runtimeStageConnectorLine} />
                <span className={styles.runtimeStageConnectorDot}>↓</span>
              </div>
              <div className={styles.runtimeGrid}>
                {runtimeLanes.map((lane) => (
                  <section key={lane.key} className={clsx(styles.runtimeLane, styles[`runtimeLane_${lane.tone}`])}>
                    <header className={styles.runtimeLaneHeader}>
                      <h4>{pickLocalized(i18n.currentLocale, lane.title)}</h4>
                      <span className={styles.runtimeLaneSummary}>{pickLocalized(i18n.currentLocale, lane.summary)}</span>
                    </header>
                    <div className={styles.runtimeLaneFlow}>
                      {lane.steps.map((step, index) => (
                        <React.Fragment key={step.key}>
                          <div className={clsx(styles.runtimeNode, styles[`runtimeNode_${step.emphasis}`])}>{pickLocalized(i18n.currentLocale, step.label)}</div>
                          {index < lane.steps.length - 1 && (
                            <div className={styles.runtimeArrow} aria-hidden="true">
                              <span className={styles.runtimeArrowLine} />
                              <span className={styles.runtimeArrowDot}>↓</span>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className={styles.runtimeResourceConnector} aria-hidden="true"><span className={styles.runtimeResourceConnectorLine} /></div>
              <div className={styles.runtimeResources}>
                <span className={styles.runtimeResourcesLabel}>{isZh ? '资源语义' : 'Resource semantics'}</span>
                <div className={styles.runtimeResourcesValue}>
                  <code>nvidia.com/gpu</code>&nbsp;+&nbsp;<code>gpumem</code>/<code>gpucores</code>
                </div>
              </div>
            </article>

            <article ref={addRevealRef} data-reveal-scale="1" className={clsx(styles.beforeAfterVisual, styles.reveal)} aria-label={isZh ? '使用 HAMi 前后示意对比' : 'Before and after HAMi diagram'}>
              <h3>{isZh ? '使用 HAMi 前后对比' : 'Before vs After HAMi'}</h3>
              <div className={styles.compareSharedInput}>
                <div className={styles.compareSharedHeader}>
                  <span className={styles.compareSharedLabel}>{isZh ? '共享输入' : 'Shared input'}</span>
                  <p>{isZh ? '同一组工作负载请求，在不同资源管理模型下得到不同放置结果。' : 'The same workload requests produce different placement outcomes under different resource management models.'}</p>
                </div>
                <div className={styles.compareSharedRequests}>
                  {compareRequests.map((request) => (
                    <div key={request.key} className={clsx(styles.compareRequest, styles.compareSharedRequest, styles[`compareRequest_${request.tone}`])}>
                      <span className={styles.compareRequestName}>{request.name}</span>
                      <span className={styles.compareRequestUsage}>{pickLocalized(i18n.currentLocale, request.usage)}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.compareBranchRail} aria-hidden="true">
                  <span className={styles.compareBranchLine} />
                  <span className={styles.compareBranchSplit} />
                </div>
              </div>
              <div className={styles.compareVisualGrid}>
                {compareScenarios.map((scenario) => (
                  <section key={scenario.key} className={clsx(styles.comparePanel, styles[`comparePanel_${scenario.key}`])}>
                    <header className={styles.comparePanelHeader}>
                      <div>
                        <h4>{pickLocalized(i18n.currentLocale, scenario.title)}</h4>
                      </div>
                      <span className={styles.comparePanelBadge}>{pickLocalized(i18n.currentLocale, scenario.result)}</span>
                    </header>
                    <div className={styles.compareResultRow}>
                      <span className={styles.compareResultChip}>{pickLocalized(i18n.currentLocale, scenario.result)}</span>
                      {scenario.policies.map((policy) => (
                        <span key={policy.en} className={clsx(styles.compareResultChip, styles.comparePolicyChip)}>{pickLocalized(i18n.currentLocale, policy)}</span>
                      ))}
                    </div>
                    <div className={styles.compareGpuRack}>
                      {scenario.gpus.map((gpu) => (
                        <article key={gpu.key} className={styles.compareGpuCard}>
                          <header className={styles.compareGpuHeader}>
                            <div>
                              <h5>{gpu.name}</h5>
                              <span>{pickLocalized(i18n.currentLocale, gpu.mode)}</span>
                            </div>
                            <strong className={styles.compareUtilizationValue}>{gpu.utilization}</strong>
                          </header>
                          <div className={styles.compareGpuGrid}>
                            {buildGpuCells(gpu.allocations).map((cell) => (
                              <span key={`${gpu.key}-${cell.key}`} className={clsx(styles.compareGpuCell, cell.tone !== 'empty' && styles[`compareGpuCell_${cell.tone}`], cell.tone === 'empty' && styles.compareGpuCell_empty)} />
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className={styles.compareOutcomeRow}>
                      <span className={styles.compareOutcomeText}>{pickLocalized(i18n.currentLocale, scenario.summary)}</span>
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.sectionAlt, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '生态与设备支持' : 'Ecosystem & Device Support'}</h2>
            <p className={styles.sectionLead}>
              {isZh
                ? '覆盖多厂商加速设备生态，详情和支持矩阵见文档。'
                : 'Broad accelerator ecosystem across vendors. See docs for full support matrix.'}
            </p>
            <div className={styles.supportersWrap}>
              <ul className="support-wrapper" aria-label={isZh ? 'HAMi 生态支持' : 'HAMi ecosystem wall'}>
                {vendorEcosystem.map((vendor) => (
                  <li key={vendor.key}>
                    <a href={vendor.href} target="_blank" rel="noopener noreferrer" className="adopter-card-link">
                      {vendor.logo && <img src={useBaseUrl(vendor.logo)} alt={vendor.name} />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <Link className={clsx(styles.inlineLink, styles.supportDocsLink)} to={useBaseUrl('/docs/userguide/Device-supported')}>
              {isZh ? '查看完整设备支持列表 →' : 'View full supported devices list →'}
            </Link>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '采用者' : 'Adopters'}</h2>
            <p className={styles.sectionLead}>
              {isZh
                ? '以下组织正在评估或在生产环境中使用 HAMi。'
                : 'The organizations below are evaluating or using HAMi in production environments.'}
            </p>
            <div className={styles.supportersWrap}>
              <AdoptersList />
            </div>
            <article className={clsx(styles.adoptersCta, 'hami-section-card')}>
              <h3 className={styles.adoptersCtaTitle}>
                {isZh ? '加入采用者列表' : 'Join the adopters list'}
              </h3>
              <p className={styles.adoptersCtaText}>
                {isZh
                  ? '请按照贡献者指南流程提交贵组织信息。'
                  : 'Submit your organization through the contributor guide process.'}
              </p>
              <a
                className={clsx('button', 'button--primary', styles.adoptersCtaButton)}
                href="https://github.com/Project-HAMi/HAMi/issues/4"
                target="_blank"
                rel="noreferrer">
                {isZh ? '查看提交说明 →' : 'See submission instructions →'}
              </a>
            </article>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.sectionAlt, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '贡献组织' : 'Contributors'}</h2>
            <p className={styles.sectionLead}>
              {isZh
                ? 'HAMi 由社区与企业贡献者共同推进，以下组织持续参与项目建设与生态协作。'
                : 'HAMi is advanced by contributors from the community and industry. These organizations actively participate in project development and ecosystem collaboration.'}
            </p>
            <div className={styles.supportersWrap}>
              <ContributorsList />
            </div>
          </div>
        </section>

      </main>
    </Layout>
  );
}
