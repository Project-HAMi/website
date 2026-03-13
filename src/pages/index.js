import React, { useEffect, useRef, useCallback, useState } from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingCircleCheck,
  faBoxOpen,
  faChartLine,
  faCircleInfo,
  faCircleNodes,
  faCubesStacked,
  faGaugeHigh,
  faGlobe,
  faNetworkWired,
  faPuzzlePiece,
  faShareNodes,
  faShieldHalved,
  faStar,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import styles from './styles.module.css';
import ContributorsList from '../components/contributorsList';
import AdoptersList from '../components/adoptersList';
import BeforeAfterComparison from '../components/BeforeAfterComparison';
import heroStats from '../data/home/heroStats';
import valueCards from '../data/home/valueCards';

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
const heroWorkloadEcosystem = [
  { key: 'deepseek', label: { en: 'DeepSeek', zh: 'DeepSeek' }, logo: 'img/ecosystem/deepseek.svg' },
  { key: 'vllm', label: { en: 'vLLM', zh: 'vLLM' }, logo: 'img/ecosystem/vllm.png' },
  { key: 'xinference', label: { en: 'Xinference', zh: 'Xinference' }, logo: 'img/ecosystem/xinference.svg' },
  { key: 'llm', label: { en: 'LLM', zh: 'LLM' } },
  { key: 'ml', label: { en: 'ML', zh: 'ML' } },
  { key: 'hpc', label: { en: 'HPC', zh: 'HPC' } },
];
const heroSchedulerEcosystem = [
  { key: 'kubernetes', label: { en: 'Kubernetes', zh: 'Kubernetes' }, logo: 'img/ecosystem/kubernetes.svg' },
  { key: 'volcano', label: { en: 'Volcano', zh: 'Volcano' }, logo: 'img/ecosystem/volcano.png' },
  { key: 'kueue', label: { en: 'Kueue', zh: 'Kueue' }, logo: 'img/ecosystem/kueue.svg' },
  { key: 'koordinator', label: { en: 'Koordinator', zh: 'Koordinator' }, logo: 'img/ecosystem/koordinator.svg' },
];
const heroGpuSlices = ['GPU', '1/2', '1/4', '1/N'];
const heroDeviceEcosystem = [
  { key: 'nvidia', label: { en: 'NVIDIA', zh: 'NVIDIA' }, logo: 'img/ecosystem/nvidia.svg' },
  { key: 'ascend', label: { en: 'Huawei Ascend', zh: '华为昇腾' }, logo: 'img/contributors/ascend.svg' },
  { key: 'cambricon', label: { en: 'Cambricon', zh: '寒武纪' }, logo: 'img/contributors/cambricon.svg' },
  { key: 'hygon', label: { en: 'Hygon', zh: '海光' }, logo: 'img/contributors/hygon.png' },
  { key: 'enflame', label: { en: 'Enflame', zh: '燧原' }, logo: 'img/contributors/enflame.svg' },
  { key: 'iluvatar', label: { en: 'Iluvatar', zh: '天数智芯' }, logo: 'img/contributors/iluvatar.png' },
  { key: 'kunlunxin', label: { en: 'Kunlunxin', zh: '昆仑芯' }, logo: 'img/contributors/kunlunxin.jpg' },
  { key: 'mthreads', label: { en: 'Moore Threads', zh: '摩尔线程' }, logo: 'img/contributors/mthread.png' },
  { key: 'metax', label: { en: 'MetaX', zh: '沐曦' }, logo: 'img/contributors/metax.png' },
  { key: 'aws-neuron', label: { en: 'AWS Neuron', zh: 'AWS Neuron' }, logo: 'img/ecosystem/aws.svg' },
  { key: 'vaststream', label: { en: 'Vaststream', zh: '壁仞' }, logo: 'img/ecosystem/vaststream.jpg' },
];
const heroDiagramCopy = {
  workloads: {
    en: 'AI Workloads',
    zh: 'AI 工作负载',
  },
  schedulerEcosystem: {
    en: 'Kubernetes Scheduling Ecosystem',
    zh: 'Kubernetes 调度生态',
  },
  heterogeneousAccelerators: {
    en: 'Heterogeneous Accelerators',
    zh: '异构加速器',
  },
  hamiLogoAlt: {
    en: 'HAMi logo',
    zh: 'HAMi 图标',
  },
  moreAccelerators: {
    en: 'and more...',
    zh: '更多',
  },
  capabilities: {
    en: 'Virtualization • Sharing • Isolation • Scheduling',
    zh: '虚拟化 • 共享 • 隔离 • 调度',
  },
  gpuSlicing: {
    en: 'GPU slicing capabilities',
    zh: 'GPU 切分能力',
  },
  observability: {
    en: 'Observability',
    zh: '可观测性',
  },
  allocatedDevices: {
    en: 'Allocated Devices',
    zh: '已分配设备',
  },
  allocatedDevicesDesc: {
    en: 'Allocation count and spread',
    zh: '设备分配总量与分布',
  },
  realTimeUsage: {
    en: 'vGPU Real-time Usage',
    zh: 'vGPU 实时使用率',
  },
  realTimeUsageDesc: {
    en: 'GPU memory/core utilization',
    zh: '显存 / 核心利用趋势',
  },
};
const runtimeLanes = [
  {
    key: 'control',
    tone: 'control',
    title: { en: 'Control Plane', zh: '控制面' },
    summary: { en: 'Decision path', zh: '决策路径' },
    steps: [
      {
        key: 'webhook',
        emphasis: 'secondary',
        label: { en: 'MutatingWebhook', zh: 'MutatingWebhook' },
        note: { en: 'admission entry', zh: '准入入口' },
      },
      {
        key: 'scheduler',
        emphasis: 'primary',
        label: { en: 'HAMi Scheduler', zh: 'HAMi Scheduler' },
        note: { en: 'policy / topology', zh: '策略 / 拓扑' },
      },
      {
        key: 'binding',
        emphasis: 'primary',
        label: { en: 'Device binding decision', zh: '设备绑定决策' },
        note: { en: 'target GPU selected', zh: '完成目标设备选择' },
      },
    ],
  },
  {
    key: 'data',
    tone: 'data',
    title: { en: 'Data Plane', zh: '数据面' },
    summary: { en: 'Enforcement path', zh: '执行路径' },
    steps: [
      {
        key: 'injection',
        emphasis: 'primary',
        label: { en: 'Device Plugin + CDI injection', zh: 'Device Plugin + CDI 注入' },
        note: { en: 'device attached', zh: '完成设备注入' },
      },
      {
        key: 'isolation',
        emphasis: 'primary',
        label: { en: 'HAMi Core', zh: 'HAMi Core' },
        note: { en: 'memory / core isolation', zh: '内存 / 核心隔离' },
      },
      {
        key: 'runtime',
        emphasis: 'secondary',
        label: { en: 'Container workload', zh: '容器工作负载' },
        note: { en: 'execution starts', zh: '开始运行' },
      },
    ],
  },
];
const runtimeDiagramCopy = {
  title: { en: 'HAMi Runtime Mechanism', zh: 'HAMi 运行时机制' },
  entryLabel: { en: 'Request Entry / Runtime Interface', zh: '请求入口 / 运行时接口' },
  entryValue: {
    en: 'PodSpec + Device Plugin / DRA + CDI',
    zh: 'PodSpec + Device Plugin / DRA + CDI 运行时接口',
  },
};
const architectureSectionCopy = {
  lead: {
    en: 'From request to isolation, HAMi turns GPU slicing and heterogeneous scheduling into usable Kubernetes runtime paths.',
    zh: '从请求到隔离执行，HAMi 将 GPU 切分与异构调度组织成可落地的 Kubernetes 运行时链路。',
  },
};
const vendorEcosystem = [
  { key: 'nvidia', name: 'NVIDIA', logo: 'img/ecosystem/nvidia.svg', href: 'https://www.nvidia.com' },
  { key: 'aws', name: 'AWS', logo: 'img/ecosystem/aws.svg', href: 'https://www.aws.com' },
  { key: 'ascend', name: 'Huawei Ascend', logo: 'img/contributors/ascend.svg', href: 'https://www.hiascend.com' },
  { key: 'cambricon', name: 'Cambricon', logo: 'img/contributors/cambricon.svg', href: 'https://www.cambricon.com' },
  { key: 'enflame', name: 'Enflame', logo: 'img/contributors/enflame.svg', href: 'https://www.enflame-tech.com' },
  { key: 'hygon', name: 'Hygon', logo: 'img/contributors/hygon.png', href: 'https://www.hygon.cn' },
  { key: 'iluvatar', name: 'Iluvatar', logo: 'img/contributors/iluvatar.png', href: 'https://www.iluvatar.com' },
  { key: 'kunlunxin', name: 'Kunlunxin', logo: 'img/contributors/kunlunxin.jpg', href: 'https://www.kunlunxin.com' },
  { key: 'metax', name: 'Metax', logo: 'img/contributors/metax.png', href: 'https://www.metax-tech.com' },
  { key: 'mthreads', name: 'Mthreads', logo: 'img/contributors/mthread.png', href: 'https://www.mthreads.com' },
  { key: 'vaststream', name: 'Vaststream', logo: 'img/ecosystem/vaststream.jpg', href: 'https://www.vastaitech.com' },
];

const DEVSTATS_URL = 'https://hami.devstats.cncf.io/d/18/overall-project-statistics-table?orgId=1';
const GITHUB_REPO_URL = 'https://github.com/Project-HAMi/HAMi';
const DOCKER_IMAGE_URL = 'https://hub.docker.com/r/projecthami/hami';

function formatCompactNumber(value) {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${Math.round(value)}`;
}

function useCountUp(target, duration = 900) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target) || target <= 0) {
      setDisplayValue(0);
      return;
    }
    let frameId;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return displayValue;
}

function pickLocalized(locale, textObj) {
  return locale === 'zh' ? textObj.zh : textObj.en;
}
function pickLocalizedOrRaw(locale, value) {
  return typeof value === 'string' ? value : pickLocalized(locale, value);
}

function RuntimeLaneCard({ lane, locale }) {
  return (
    <section className={styles.runtimeLane} data-runtime-part={lane.key}>
      <header className={styles.runtimeLaneHeader}>
        <h3>{pickLocalized(locale, lane.title)}</h3>
        <span className={styles.runtimeLaneKicker}>{pickLocalized(locale, lane.summary)}</span>
      </header>
      <div className={styles.runtimeLaneFlow}>
        {lane.steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <article className={clsx(styles.runtimeStepCard, styles[`runtimeStepCard_${step.emphasis}`])}>
              <span className={styles.runtimeStepLabel}>{pickLocalized(locale, step.label)}</span>
              <span className={styles.runtimeStepNote}>{pickLocalized(locale, step.note)}</span>
            </article>
            {index < lane.steps.length - 1 && (
              <div className={styles.runtimeArrow} aria-hidden="true">
                <span className={styles.runtimeArrowLine} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === 'zh';
  const [starsCount, setStarsCount] = useState(3100);
  const [dockerPulls, setDockerPulls] = useState(114000);
  const kubernetesLogo = useBaseUrl('img/kubernetes-logo.svg');
  const hamiLogo = useBaseUrl('img/hami-graph-color.svg');
  const hamiHorizontalLogoLight = useBaseUrl('img/hami-horizontal-color-black.svg');
  const hamiHorizontalLogoDark = useBaseUrl('img/hami-horizontal-color-white.svg');
  const contributorsCount = useCountUp(500);
  const contributorCountries = useCountUp(17);
  const starsCountDisplay = useCountUp(starsCount);
  const dockerPullsDisplay = useCountUp(dockerPulls);

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

  useEffect(() => {
    const controller = new AbortController();

    const fetchGitHubStars = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/Project-HAMi/HAMi', { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.stargazers_count === 'number') {
          setStarsCount(data.stargazers_count);
        }
      } catch (error) {
        // Keep fallback value when API is unavailable.
      }
    };

    const fetchDockerPulls = async () => {
      try {
        const response = await fetch('https://hub.docker.com/v2/repositories/projecthami/hami/', { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.pull_count === 'number') {
          setDockerPulls(data.pull_count);
        }
      } catch (error) {
        // Keep fallback value when API is unavailable.
      }
    };

    fetchGitHubStars();
    fetchDockerPulls();

    return () => controller.abort();
  }, []);

  return (
    <Layout
      title={isZh ? 'Kubernetes 上的异构 GPU 共享' : 'Heterogeneous GPU Sharing on Kubernetes'}
      description={
        isZh
          ? 'HAMi 是开源的云原生 GPU 虚拟化中间件，为 AI 工作负载提供异构加速器的共享、隔离与调度能力。'
          : 'HAMi is an open-source, cloud-native GPU virtualization middleware that brings sharing, isolation and scheduling of heterogeneous accelerators to AI workloads on Kubernetes.'
      }>
      <main>
        <section className={clsx(styles.hero, 'hami-shell-bg')}>
          <div className={styles.heroContainer}>
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
                    ? 'Kubernetes 上的异构 GPU 共享'
                    : 'Heterogeneous GPU Sharing on Kubernetes'}
                </h1>
                <p className={styles.heroSubtitle}>
                  {isZh
                    ? 'HAMi 是开源的云原生 GPU 虚拟化中间件，为 AI 工作负载提供异构加速器的共享、隔离与调度能力。'
                    : 'HAMi is an open-source, cloud-native GPU virtualization middleware that brings sharing, isolation and scheduling of heterogeneous accelerators to AI workloads on Kubernetes.'}
                </p>
                <div className={styles.heroFeatureChips}>
                  {(isZh
                    ? ['GPU 切分', '异构加速器', 'Kubernetes 原生调度']
                    : ['GPU Slicing', 'Heterogeneous Accelerators', 'Kubernetes-native Scheduling']
                  ).map((chip) => (
                    <span key={chip} className={styles.heroFeatureChip}>{chip}</span>
                  ))}
                </div>
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
                <div className={styles.ecosystemDiagram} role="img" aria-label={isZh ? 'HAMi AI 基础设施生态架构图' : 'HAMi AI infrastructure ecosystem architecture diagram'}>
                  <div className={styles.ecosystemStack}>
                    <section className={clsx(styles.ecoLayer, styles.ecoLayerWorkloads)}>
                      <h3>{pickLocalized(i18n.currentLocale, heroDiagramCopy.workloads)}</h3>
                      <div className={styles.ecoLogoGrid}>
                        {heroWorkloadEcosystem.map((item) => (
                          <div key={item.key} className={styles.ecoLogoChip}>
                            {item.logo ? (
                              <img src={useBaseUrl(item.logo)} alt={pickLocalizedOrRaw(i18n.currentLocale, item.label)} />
                            ) : (
                              <span>{pickLocalizedOrRaw(i18n.currentLocale, item.label)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.ecoCoreRow}>
                      <div className={styles.ecoCoreStack}>
                        <section className={clsx(styles.ecoLayer, styles.ecoLayerScheduler)}>
                          <h3>{pickLocalized(i18n.currentLocale, heroDiagramCopy.schedulerEcosystem)}</h3>
                          <div className={styles.schedulerEcosystemGrid}>
                            {heroSchedulerEcosystem.map((item) => (
                              <div key={item.key} className={styles.ecoLogoChip}>
                                <img src={useBaseUrl(item.logo)} alt={pickLocalizedOrRaw(i18n.currentLocale, item.label)} />
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className={styles.hamiCenterLayer}>
                          <section className={styles.hamiPlatformBlock}>
                            <h3 className={styles.hamiTitle}>
                              <img src={hamiHorizontalLogoLight} alt={pickLocalized(i18n.currentLocale, heroDiagramCopy.hamiLogoAlt)} className={styles.hamiLogoLight} />
                              <img src={hamiHorizontalLogoDark} alt={pickLocalized(i18n.currentLocale, heroDiagramCopy.hamiLogoAlt)} className={styles.hamiLogoDark} />
                            </h3>
                            <p>{pickLocalized(i18n.currentLocale, heroDiagramCopy.capabilities)}</p>
                            <section className={styles.gpuSliceRow} aria-label={pickLocalized(i18n.currentLocale, heroDiagramCopy.gpuSlicing)}>
                              {heroGpuSlices.map((slice, index) => (
                                <React.Fragment key={slice}>
                                  <div className={styles.gpuSliceChip}>
                                    <span className={styles.gpuSliceIcon} aria-hidden="true" />
                                    <span>{slice}</span>
                                  </div>
                                  {index < heroGpuSlices.length - 1 && <span className={styles.gpuSliceArrow} aria-hidden="true">→</span>}
                                </React.Fragment>
                              ))}
                            </section>
                          </section>
                        </section>
                      </div>

                      <aside className={styles.observabilityPanel}>
                        <h4>{pickLocalized(i18n.currentLocale, heroDiagramCopy.observability)}</h4>
                        <div className={styles.observabilityMetric}>
                          <span className={styles.observabilityIcon} aria-hidden="true">
                            <FontAwesomeIcon icon={faCubesStacked} />
                          </span>
                          <div>
                            <strong>{pickLocalized(i18n.currentLocale, heroDiagramCopy.allocatedDevices)}</strong>
                            <p>{pickLocalized(i18n.currentLocale, heroDiagramCopy.allocatedDevicesDesc)}</p>
                          </div>
                        </div>
                        <div className={styles.observabilityMetric}>
                          <span className={styles.observabilityIcon} aria-hidden="true">
                            <FontAwesomeIcon icon={faChartLine} />
                          </span>
                          <div>
                            <strong>{pickLocalized(i18n.currentLocale, heroDiagramCopy.realTimeUsage)}</strong>
                            <p>{pickLocalized(i18n.currentLocale, heroDiagramCopy.realTimeUsageDesc)}</p>
                          </div>
                        </div>
                        <div className={styles.observabilityLogoRow}>
                          <div className={styles.ecoLogoChip}>
                            <img src={useBaseUrl('img/ecosystem/prometheus.svg')} alt="Prometheus" />
                          </div>
                          <div className={styles.ecoLogoChip}>
                            <img src={useBaseUrl('img/ecosystem/opentelemetry.svg')} alt="OpenTelemetry" />
                          </div>
                        </div>
                      </aside>
                    </section>

                    <section className={clsx(styles.ecoLayer, styles.ecoLayerDevices)}>
                      <h3>{pickLocalized(i18n.currentLocale, heroDiagramCopy.heterogeneousAccelerators)}</h3>
                      <div className={styles.ecoLogoGrid}>
                        {heroDeviceEcosystem.map((item) => (
                          <div key={item.key} className={styles.ecoLogoChip}>
                            <img src={useBaseUrl(item.logo)} alt={pickLocalizedOrRaw(i18n.currentLocale, item.label)} />
                          </div>
                        ))}
                        <div className={styles.ecoOpenChip}>
                          {pickLocalized(i18n.currentLocale, heroDiagramCopy.moreAccelerators)}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.cncfSection, styles.reveal)}>
          <div className="container">
            <div className={styles.cncfFeature}>
              <div className={styles.cncfFeatureMedia}>
                <div className={styles.cncfLogoBox}>
                  <img src={useBaseUrl('img/cncf-color.svg')} alt="CNCF logo" className={styles.cncfFeatureLogoLight} />
                </div>
                <div className={styles.cnaiLogoBox}>
                  <img src={useBaseUrl('img/ecosystem/cnai.svg')} alt="CNAI Landscape logo" className={styles.cnaiLogo} />
                </div>
              </div>
              <div className={styles.cncfFeatureBody}>
                <span className={styles.cncfEyebrow}>{isZh ? 'CNCF Sandbox 项目' : 'CNCF Sandbox Project'}</span>
                <h2 className={styles.cncfFeatureTitle}>
                  {isZh ? 'HAMi 是 CNCF Sandbox 项目' : 'HAMi is a CNCF Sandbox project'}
                </h2>
                <p className={styles.cncfFeatureText}>
                  {isZh ? (
                    <>
                      HAMi 是云原生计算基金会（CNCF）的{' '}
                      <a href="https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami" target="_blank" rel="noopener noreferrer">Sandbox 项目</a>，
                      并被收录于 CNCF 技术全景图和 CNAI 技术全景图。
                    </>
                  ) : (
                    <>
                      HAMi is a <a href="https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami" target="_blank" rel="noopener noreferrer">Sandbox project</a> of the
                      Cloud Native Computing Foundation (CNCF), listed in both the CNCF Landscape and the CNAI Landscape.
                    </>
                  )}
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
                const isKubernetesCard = card.icon === 'kubernetes';
                return (
                  <article key={card.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardIcon} aria-hidden="true">
                        {isKubernetesCard ? (
                          <img src={kubernetesLogo} alt="" className={styles.cardIconImage} />
                        ) : (
                          <FontAwesomeIcon icon={icon} />
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        <h3>{pickLocalized(i18n.currentLocale, card.title)}</h3>
                        <p>{pickLocalized(i18n.currentLocale, card.description)}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '架构与工作原理' : 'Architecture & How It Works'}</h2>
            <p className={styles.sectionLead}>{pickLocalized(i18n.currentLocale, architectureSectionCopy.lead)}</p>

            <div className={styles.architectureOverview}>
              <article
                ref={addRevealRef}
                data-reveal-scale="1"
                className={clsx(styles.runtimeMechanism, styles.reveal)}
                aria-label={isZh ? 'HAMi 运行时机制架构图' : 'HAMi runtime architecture diagram'}>
                <div className={styles.runtimeDiagramFrame} role="img" aria-label={isZh ? 'HAMi 运行时机制架构图' : 'HAMi runtime architecture diagram'}>
                  <h3 className={styles.runtimeDiagramTitle}>{pickLocalized(i18n.currentLocale, runtimeDiagramCopy.title)}</h3>
                  <section className={styles.runtimeStage} data-runtime-part="entry">
                    <span className={styles.runtimeSectionLabel}>{pickLocalized(i18n.currentLocale, runtimeDiagramCopy.entryLabel)}</span>
                    <div className={styles.runtimeStageCard}>
                      {pickLocalized(i18n.currentLocale, runtimeDiagramCopy.entryValue)}
                    </div>
                  </section>
                  <div className={styles.runtimeStageConnector} aria-hidden="true">
                    <span className={styles.runtimeConnectorLine} />
                  </div>
                  <section className={styles.runtimePipelineSection} data-runtime-part="pipeline">
                    <div className={styles.runtimeLaneGrid}>
                      <RuntimeLaneCard lane={runtimeLanes[0]} locale={i18n.currentLocale} />
                      <RuntimeLaneCard lane={runtimeLanes[1]} locale={i18n.currentLocale} />
                    </div>
                  </section>
                  <section className={styles.runtimeResources} data-runtime-part="resources">
                    <span className={styles.runtimeResourcesLabel}>{isZh ? '资源语义' : 'Resource Semantics'}</span>
                    <div className={styles.runtimeResourcesValue}>
                      <code>nvidia.com/gpu</code>
                      <span className={styles.runtimeResourcesDivider}>+</span>
                      <code>gpumem</code>
                      <span className={styles.runtimeResourcesSlash}>/</span>
                      <code>gpucores</code>
                    </div>
                  </section>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{isZh ? '使用 HAMi 前后对比' : 'Before and After Using HAMi'}</h2>
            <p className={styles.sectionLead}>
              {isZh
                ? '相同工作负载下，对比传统整卡独占与 HAMi GPU 共享后的资源利用率变化。'
                : 'Compare traditional whole-GPU allocation with HAMi GPU sharing under the same workloads.'}
            </p>

            <div ref={addRevealRef} data-reveal-scale="1" className={clsx(styles.reveal, styles.beforeAfterWrapper)}>
              <BeforeAfterComparison isZh={isZh} showHeader={false} />
            </div>
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
            <article className={styles.adoptersCta}>
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
            <div className={styles.communityMetricsHeader}>
              <h3 className={styles.communityMetricsTitle}>
                {isZh ? '全球社区指标' : 'Global Community Metrics'}
              </h3>
              <p className={styles.communityMetricsDesc}>
                {isZh
                  ? '实时展示 HAMi 社区增长与开源活跃度。'
                  : 'A live snapshot of HAMi community growth and open-source momentum.'}
              </p>
            </div>
            <div className={styles.communityMetricsRow}>
              <article className={styles.communityMetricCard}>
                <div className={styles.communityMetricHead}>
                  <span className={styles.communityMetricIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={faStar} />
                  </span>
                  <strong>{isZh ? 'GitHub Stars' : 'GitHub Stars'}</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={isZh ? '数据来源：GitHub' : 'Source: GitHub'}
                    aria-label={isZh ? '查看 Stars 数据来源' : 'View stars data source'}>
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </a>
                </div>
                <span>{formatCompactNumber(starsCountDisplay)}</span>
              </article>
              <article className={styles.communityMetricCard}>
                <div className={styles.communityMetricHead}>
                  <span className={styles.communityMetricIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={faBoxOpen} />
                  </span>
                  <strong>{isZh ? '镜像下载' : 'Docker Pulls'}</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={DOCKER_IMAGE_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={isZh ? '数据来源：Docker Hub' : 'Source: Docker Hub'}
                    aria-label={isZh ? '查看 Docker 下载数据来源' : 'View Docker pulls data source'}>
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </a>
                </div>
                <span>{formatCompactNumber(dockerPullsDisplay)}</span>
              </article>
              <article className={styles.communityMetricCard}>
                <div className={styles.communityMetricHead}>
                  <span className={styles.communityMetricIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={faUsers} />
                  </span>
                  <strong>{isZh ? '贡献者' : 'Contributors'}</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={DEVSTATS_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={isZh ? '数据来源：DevStats' : 'Source: DevStats'}
                    aria-label={isZh ? '查看贡献者数据来源' : 'View contributors data source'}>
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </a>
                </div>
                <span>{contributorsCount}+</span>
              </article>
              <article className={styles.communityMetricCard}>
                <div className={styles.communityMetricHead}>
                  <span className={styles.communityMetricIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={faGlobe} />
                  </span>
                  <strong>{isZh ? '贡献者国家' : 'Contributor Countries'}</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={DEVSTATS_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={isZh ? '数据来源：DevStats' : 'Source: DevStats'}
                    aria-label={isZh ? '查看国家数据来源' : 'View countries data source'}>
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </a>
                </div>
                <span>{contributorCountries}</span>
              </article>
            </div>
            <div className={styles.communityMetricActions}>
              <a className={clsx('button', 'button--primary')} href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                {isZh ? '给 HAMi 点个 Star' : 'Star HAMi on GitHub'}
              </a>
              <Link className={clsx('button', 'button--outline')} to={useBaseUrl('/community')}>
                {isZh ? '加入社区' : 'Join Community'}
              </Link>
            </div>
          </div>
        </section>

      </main>
    </Layout>
  );
}
