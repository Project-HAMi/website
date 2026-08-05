import React, { useEffect, useRef, useCallback, useState } from "react";
import clsx from "clsx";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
} from "@fortawesome/free-solid-svg-icons";
import styles from "./styles.module.css";
import ContributorsList from "../components/contributorsList";
import LogoWall from "../components/logoWall";
import BeforeAfterComparison from "../components/BeforeAfterComparison";
import adoptersData from "../data/adopters.json";
import ecosystemData from "../data/ecosystem.json";
import heroStats from "../data/home/heroStats";
import valueCards from "../data/home/valueCards";

const cardIcons = {
  "network-wired": faNetworkWired,
  "share-nodes": faShareNodes,
  "shield-halved": faShieldHalved,
  "puzzle-piece": faPuzzlePiece,
  "cubes-stacked": faCubesStacked,
  "building-circle-check": faBuildingCircleCheck,
  "gauge-high": faGaugeHigh,
  "chart-line": faChartLine,
};

const fallbackCardIcon = faCircleNodes;
const heroWorkloadEcosystem = [
  {
    key: "deepseek",
    label: { en: "DeepSeek", zh: "DeepSeek" },
    logo: "img/ecosystem/deepseek.svg",
  },
  { key: "vllm", label: { en: "vLLM", zh: "vLLM" }, logo: "img/ecosystem/vllm.png" },
  {
    key: "xinference",
    label: { en: "Xinference", zh: "Xinference" },
    logo: "img/ecosystem/xinference.svg",
  },
  {
    key: "qwen",
    label: { en: "Qwen", zh: "通义千问" },
    logo: "img/ecosystem/qwen.svg",
  },
  { key: "ray", label: { en: "Ray", zh: "Ray" }, logo: "img/ecosystem/ray.svg" },
  { key: "llm", label: { en: "LLM", zh: "LLM" } },
  { key: "ml", label: { en: "ML", zh: "ML" } },
  { key: "hpc", label: { en: "HPC", zh: "HPC" } },
];
const heroSchedulerEcosystem = [
  {
    key: "kubernetes",
    label: { en: "Kubernetes", zh: "Kubernetes" },
    logo: "img/ecosystem/kubernetes.svg",
  },
  { key: "volcano", label: { en: "Volcano", zh: "Volcano" }, logo: "img/ecosystem/volcano.png" },
  { key: "kueue", label: { en: "Kueue", zh: "Kueue" }, logo: "img/ecosystem/kueue.svg" },
  {
    key: "koordinator",
    label: { en: "Koordinator", zh: "Koordinator" },
    logo: "img/ecosystem/koordinator.svg",
  },
  {
    key: "kai-scheduler",
    label: { en: "KAI Scheduler", zh: "KAI Scheduler" },
    logo: "img/ecosystem/kai-scheduler.png",
  },
];
const heroGpuSlices = ["GPU", "1/2", "1/4", "1/N"];
const heroDeviceEcosystem = [
  { key: "nvidia", label: { en: "NVIDIA", zh: "NVIDIA" }, logo: "img/ecosystem/nvidia.svg" },
  {
    key: "ascend",
    label: { en: "Huawei Ascend", zh: "华为昇腾" },
    logo: "img/contributors/ascend.svg",
  },
  {
    key: "cambricon",
    label: { en: "Cambricon", zh: "寒武纪" },
    logo: "img/contributors/cambricon.svg",
  },
  { key: "hygon", label: { en: "Hygon", zh: "海光" }, logo: "img/contributors/hygon.png" },
  { key: "enflame", label: { en: "Enflame", zh: "燧原" }, logo: "img/contributors/enflame.svg" },
  {
    key: "iluvatar",
    label: { en: "Iluvatar", zh: "天数智芯" },
    logo: "img/contributors/iluvatar.png",
  },
  {
    key: "kunlunxin",
    label: { en: "Kunlunxin", zh: "昆仑芯" },
    logo: "img/contributors/kunlunxin.jpg",
  },
  {
    key: "mthreads",
    label: { en: "Moore Threads", zh: "摩尔线程" },
    logo: "img/contributors/mthread.png",
  },
  { key: "metax", label: { en: "MetaX", zh: "沐曦" }, logo: "img/contributors/metax.png" },
  {
    key: "aws-neuron",
    label: { en: "AWS Neuron", zh: "AWS Neuron" },
    logo: "img/ecosystem/aws.svg",
  },
  {
    key: "vaststream",
    label: { en: "Vastai", zh: "瀚博半导体" },
    logo: "img/ecosystem/vaststream.jpg",
  },
];
const heroDiagramCopy = {
  workloads: {
    en: "AI Workloads",
    zh: "AI 工作负载",
    it: "Workload AI",
  },
  schedulerEcosystem: {
    en: "Kubernetes Scheduling Ecosystem",
    zh: "Kubernetes 调度生态",
    it: "Ecosistema di scheduling di Kubernetes",
  },
  heterogeneousAccelerators: {
    en: "Heterogeneous Accelerators",
    zh: "异构加速器",
    it: "Acceleratori eterogenei",
  },
  hamiLogoAlt: {
    en: "HAMi logo",
    zh: "HAMi 图标",
    it: "Logo di HAMi",
  },
  moreAccelerators: {
    en: "and more...",
    zh: "更多",
    it: "e altri...",
  },
  capabilities: {
    en: "Virtualization • Sharing • Isolation • Scheduling",
    zh: "虚拟化 • 共享 • 隔离 • 调度",
    it: "Virtualizzazione • Condivisione • Isolamento • Scheduling",
  },
  gpuSlicing: {
    en: "GPU slicing capabilities",
    zh: "GPU 切分能力",
    it: "Funzionalità di slicing (suddivisione) della GPU",
  },
  observability: {
    en: "Observability",
    zh: "可观测性",
    it: "Osservabilità",
  },
  allocatedDevices: {
    en: "Allocated Devices",
    zh: "已分配设备",
    it: "Dispositivi allocati",
  },
  allocatedDevicesDesc: {
    en: "Allocation count and spread",
    zh: "设备分配总量与分布",
    it: "Conteggio e distribuzione dell'allocazione",
  },
  realTimeUsage: {
    en: "vGPU Real-time Usage",
    zh: "vGPU 实时使用率",
    it: "Utilizzo in tempo reale di vGPU",
  },
  realTimeUsageDesc: {
    en: "GPU memory/core utilization",
    zh: "显存 / 核心利用趋势",
    it: "Utilizzo di memoria/core della GPU",
  },
};
const runtimeLanes = [
  {
    key: "control",
    tone: "control",
    title: { en: "Control Plane", zh: "控制面", it: "Control Plane" },
    summary: { en: "Decision path", zh: "决策路径", it: "Percorso decisionale" },
    steps: [
      {
        key: "webhook",
        emphasis: "secondary",
        label: { en: "MutatingWebhook", zh: "MutatingWebhook", it: "MutatingWebhook" },
        note: { en: "Admission Entry", zh: "准入入口", it: "Punto di Ammissione" },
      },
      {
        key: "scheduler",
        emphasis: "primary",
        label: { en: "HAMi Scheduler", zh: "HAMi Scheduler", it: "HAMi Scheduler" },
        note: { en: "Policy / Topology", zh: "策略 / 拓扑", it: "Policy / Topologia" },
      },
      {
        key: "binding",
        emphasis: "primary",
        label: { en: "Device Binding Decision", zh: "设备绑定决策", it: "Decisione di binding del dispositivo" },
        note: { en: "Target GPU Selected", zh: "完成目标设备选择", it: "GPU di destinazione selezionata" },
      },
    ],
  },
  {
    key: "data",
    tone: "data",
    title: { en: "Data Plane", zh: "数据面", it: "Data Plane" },
    summary: { en: "Enforcement Path", zh: "执行路径", it: "Percorso di esecuzione" },
    steps: [
      {
        key: "injection",
        emphasis: "primary",
        label: { en: "Device Plugin + CDI Injection", zh: "Device Plugin + CDI 注入", it: "Device Plugin + Iniezione CDI" },
        note: { en: "Device Attached", zh: "完成设备注入", it: "Dispositivo collegato" },
      },
      {
        key: "isolation",
        emphasis: "primary",
        label: { en: "HAMi Core", zh: "HAMi Core", it: "HAMi Core" },
        note: { en: "Memory / Core Isolation", zh: "显存 / 核心隔离", it: "Isolamento di memoria / core" },
      },
      {
        key: "runtime",
        emphasis: "secondary",
        label: { en: "Container Workload", zh: "容器工作负载", it: "Workload del container" },
        note: { en: "Execution Starts", zh: "开始运行", it: "Avvio dell'esecuzione" },
      },
    ],
  },
];
const runtimeDiagramCopy = {
  title: { en: "HAMi Runtime Mechanism", zh: "HAMi 运行时机制", it: "Meccanismo di runtime di HAMi" },
  entryLabel: { en: "Request Entry / Runtime Interface", zh: "请求入口 / 运行时接口", it: "Ingresso della richiesta / Interfaccia di runtime" },
  entryValue: {
    en: "PodSpec + Device Plugin / DRA + CDI",
    zh: "PodSpec + Device Plugin / DRA + CDI 运行时接口",
  },
};
const architectureSectionCopy = {
  lead: {
    en: "From request to isolation, HAMi turns GPU slicing and heterogeneous scheduling into usable Kubernetes runtime paths.",
    zh: "从请求到隔离执行，HAMi 将 GPU 切分与异构调度组织成可落地的 Kubernetes 运行时链路。",
    it: "Dalla richiesta all'isolamento, HAMi trasforma lo slicing (suddivisione) della GPU e lo scheduling eterogeneo in percorsi di runtime utilizzabili per Kubernetes.",
  },
};
const vendorEcosystem = [
  {
    key: "nvidia",
    name: "NVIDIA",
    logo: "img/ecosystem/nvidia.svg",
    href: "https://www.nvidia.com",
  },
  { key: "aws", name: "AWS", logo: "img/ecosystem/aws.svg", href: "https://aws.amazon.com" },
  {
    key: "ascend",
    name: "Huawei Ascend",
    logo: "img/contributors/ascend.svg",
    href: "https://www.hiascend.com",
  },
  {
    key: "cambricon",
    name: "Cambricon",
    logo: "img/contributors/cambricon.svg",
    href: "https://www.cambricon.com",
  },
  {
    key: "enflame",
    name: "Enflame",
    logo: "img/contributors/enflame.svg",
    href: "https://www.enflame-tech.com",
  },
  { key: "hygon", name: "Hygon", logo: "img/contributors/hygon.png", href: "https://www.hygon.cn" },
  {
    key: "iluvatar",
    name: "Iluvatar",
    logo: "img/contributors/iluvatar.png",
    href: "https://www.iluvatar.com",
  },
  {
    key: "kunlunxin",
    name: "Kunlunxin",
    logo: "img/contributors/kunlunxin.jpg",
    href: "https://www.kunlunxin.com",
  },
  {
    key: "metax",
    name: "MetaX",
    logo: "img/contributors/metax.png",
    href: "https://www.metax-tech.com",
  },
  {
    key: "mthreads",
    name: "Moore Threads",
    logo: "img/contributors/mthread.png",
    href: "https://www.mthreads.com",
  },
  {
    key: "vaststream",
    name: "Vastai",
    logo: "img/ecosystem/vaststream.jpg",
    href: "https://www.birentech.com",
  },
];

const DEVSTATS_URL = "https://hami.devstats.cncf.io/d/18/overall-project-statistics-table?orgId=1";
const GITHUB_REPO_URL = "https://github.com/Project-HAMi/HAMi";
const DOCKER_IMAGE_URL = "https://hub.docker.com/r/projecthami/hami";

function formatCompactNumber(value) {
  if (!Number.isFinite(value)) return "--";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
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
  if (locale === "zh") return textObj.zh;
  if (locale === "it" && textObj.it) return textObj.it;
  return textObj.en;
}
function pickLocalizedOrRaw(locale, value) {
  return typeof value === "string" ? value : pickLocalized(locale, value);
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
            <article
              className={clsx(styles.runtimeStepCard, styles[`runtimeStepCard_${step.emphasis}`])}
            >
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

const heroCopy = {
  title: {
    en: "Heterogeneous GPU Sharing on Kubernetes",
    zh: "Kubernetes 上的异构 GPU 共享",
    it: "Condivisione eterogenea di GPU su Kubernetes",
  },
  description: {
    en: "HAMi is an open-source, cloud-native GPU virtualization middleware that brings sharing, isolation and scheduling of heterogeneous accelerators to AI workloads on Kubernetes.",
    zh: "HAMi 是开源的云原生 GPU 虚拟化中间件，为 AI 工作负载提供异构加速器的共享、隔离与调度能力。",
    it: "HAMi è un middleware di virtualizzazione GPU open-source e cloud-native che porta condivisione, isolamento e scheduling di acceleratori eterogenei ai workload AI su Kubernetes.",
  },
  featureChips: {
    en: ["GPU Slicing", "Heterogeneous Accelerators", "Kubernetes-native Scheduling"],
    zh: ["GPU 切分", "异构加速器", "Kubernetes 原生调度"],
    it: ["Slicing (suddivisione) della GPU", "Acceleratori eterogenei", "Scheduling nativo di Kubernetes"],
  },
  quickStart: {
    en: "Quick Start",
    zh: "快速开始",
    it: "Avvio rapido",
  },
  joinCommunity: {
    en: "Join Community",
    zh: "加入社区",
    it: "Unisciti alla community",
  },
  ariaLabel: {
    en: "HAMi AI infrastructure ecosystem architecture diagram",
    zh: "HAMi AI 基础设施生态架构图",
    it: "Diagramma dell'ecosistema dell'infrastruttura AI di HAMi",
  }
};

const cncfCopy = {
  eyebrow: {
    en: "CNCF Incubating Project",
    zh: "CNCF 孵化项目",
    it: "Progetto in incubazione CNCF",
  },
  title: {
    en: "HAMi is a CNCF Incubating project",
    zh: "HAMi 是 CNCF 孵化项目",
    it: "HAMi è un progetto in incubazione CNCF",
  },
  text: {
    en: (
      <>
        HAMi is an{" "}
        <a
          href="https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami"
          target="_blank"
          rel="noopener noreferrer"
        >
          Incubating project
        </a>{" "}
        of the Cloud Native Computing Foundation (CNCF), listed in both the CNCF
        Landscape and the CNAI Landscape.
      </>
    ),
    zh: (
      <>
        HAMi 是云原生计算基金会（CNCF）的{" "}
        <a
          href="https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami"
          target="_blank"
          rel="noopener noreferrer"
        >
          孵化项目
        </a>
        ，并被收录于 CNCF 技术全景图和 CNAI 技术全景图。
      </>
    ),
    it: (
      <>
        HAMi è un{" "}
        <a
          href="https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami"
          target="_blank"
          rel="noopener noreferrer"
        >
          progetto in incubazione
        </a>{" "}
        della Cloud Native Computing Foundation (CNCF), presente sia nell'ecosistema CNCF sia in quello CNAI.
      </>
    ),
  }
};

const whyAndArchCopy = {
  whyTitle: {
    en: "Why HAMi",
    zh: "为什么使用 HAMi",
    it: "Perché usare HAMi",
  },
  archTitle: {
    en: "Architecture & How It Works",
    zh: "架构与工作原理",
    it: "Architettura e funzionamento",
  },
  runtimeDiagramAria: {
    en: "HAMi runtime architecture diagram",
    zh: "HAMi 运行时机制架构图",
    it: "Diagramma dell'architettura di runtime di HAMi",
  },
  resourceSemantics: {
    en: "Resource Semantics",
    zh: "资源语义",
    it: "Semantica delle risorse",
  },
  beforeAfterTitle: {
    en: "Before and After Using HAMi",
    zh: "使用 HAMi 前后对比",
    it: "Confronto prima e dopo l'uso di HAMi",
  },
  beforeAfterLead: {
    en: "Compare traditional whole-GPU allocation with HAMi GPU sharing under the same workloads.",
    zh: "相同工作负载下，对比传统整卡独占与 HAMi GPU 共享后的资源利用率变化。",
    it: "Confronta l'allocazione tradizionale dell'intera GPU con la condivisione GPU di HAMi a parità di workload.",
  }
};

const footerSectionsCopy = {
  ecosystemTitle: {
    en: "Ecosystem & Device Support",
    zh: "生态与设备支持",
    it: "Ecosistema e supporto dispositivi",
  },
  ecosystemLead: {
    en: "Broad accelerator ecosystem across vendors. See docs for full support matrix.",
    zh: "覆盖多厂商加速设备生态，详情和支持矩阵见文档。",
    it: "Ampio ecosistema di acceleratori tra vari produttori. Consulta la documentazione per la matrice di supporto completa.",
  },
  ecosystemAria: {
    en: "HAMi ecosystem wall",
    zh: "HAMi 生态支持",
    it: "Muro dell'ecosistema di HAMi",
  },
  ecosystemLink: {
    en: "View full supported devices list →",
    zh: "查看完整设备支持列表 →",
    it: "Visualizza l'elenco completo dei dispositivi supportati →",
  },
  compatTitle: {
    en: "Works with HAMi",
    zh: "与 HAMi 协同",
    it: "Compatibile con HAMi",
  },
  compatLead: {
    en: "HAMi integrates with these open-source schedulers, queuing layers, and cloud platforms, either as an embeddable device layer or at the scheduling layer.",
    zh: "HAMi 与以下开源调度器、队列及云平台协同工作，既可作为设备层嵌入，也可在调度层集成。",
    it: "HAMi si integra con questi scheduler open-source, livelli di accodamento e piattaforme cloud, sia come livello di dispositivo incorporabile sia a livello di scheduling.",
  },
  adoptersTitle: {
    en: "Adopters",
    zh: "采用者",
    it: "Chi usa HAMi",
  },
  adoptersLead: {
    en: "The organizations below are evaluating or using HAMi in production environments.",
    zh: "以下组织正在评估或在生产环境中使用 HAMi。",
    it: "Le organizzazioni seguenti stanno valutando o utilizzando HAMi in ambienti di produzione.",
  },
  adoptersCtaTitle: {
    en: "Join the adopters list",
    zh: "加入采用者列表",
    it: "Unisciti all'elenco di chi usa il progetto",
  },
  adoptersCtaText: {
    en: "Submit your organization through the contributor guide process.",
    zh: "请按照贡献者指南流程提交贵组织信息。",
    it: "Invia la tua organizzazione seguendo la procedura della guida per i contributori.",
  },
  adoptersCtaButton: {
    en: "See submission instructions →",
    zh: "查看提交说明 →",
    it: "Vedi le istruzioni per l'invio →",
  },
  contributorsTitle: {
    en: "Contributors",
    zh: "贡献组织",
    it: "Contributori",
  },
  contributorsLead: {
    en: "HAMi is advanced by contributors from the community and industry. These organizations actively participate in project development and ecosystem collaboration.",
    zh: "HAMi 由社区与企业贡献者共同推进，以下组织持续参与项目建设与生态协作。",
    it: "HAMi si sviluppa grazie ai contributori della community e dell'industria. Queste organizzazioni partecipano attivamente allo sviluppo del progetto e alla collaborazione dell'ecosistema.",
  },
  metricsTitle: {
    en: "Global Community Metrics",
    zh: "全球社区指标",
    it: "Metriche della community globale",
  },
  metricsLead: {
    en: "A live snapshot of HAMi community growth and open-source momentum.",
    zh: "实时展示 HAMi 社区增长与开源活跃度。",
    it: "Una panoramica in tempo reale della crescita della community di HAMi e del suo slancio open source.",
  }
};

const metricsCopy = {
  starsSource: { en: "Source: GitHub", zh: "数据来源：GitHub", it: "Fonte: GitHub" },
  starsAria: { en: "View stars data source", zh: "查看 Stars 数据来源", it: "Visualizza fonte dati stars" },
  dockerLabel: { en: "Docker Pulls", zh: "镜像下载", it: "Download Docker" },
  dockerSource: { en: "Source: Docker Hub", zh: "数据来源：Docker Hub", it: "Fonte: Docker Hub" },
  dockerAria: { en: "View Docker pulls data source", zh: "查看 Docker 下载数据来源", it: "Visualizza fonte dati download Docker" },
  contributorsLabel: { en: "Contributors", zh: "贡献者", it: "Contributori" },
  contributorsSource: { en: "Source: DevStats", zh: "数据来源：DevStats", it: "Fonte: DevStats" },
  contributorsAria: { en: "View contributors data source", zh: "查看贡献者数据来源", it: "Visualizza fonte dati contributori" },
  countriesLabel: { en: "Contributor Countries", zh: "贡献者国家", it: "Paesi dei contributori" },
  countriesSource: { en: "Source: DevStats", zh: "数据来源：DevStats", it: "Fonte: DevStats" },
  countriesAria: { en: "View countries data source", zh: "查看国家数据来源", it: "Visualizza fonte dati paesi" },
  starButton: { en: "Star HAMi on GitHub", zh: "给 HAMi 点个 Star", it: "Metti uno Star a HAMi su GitHub" },
  communityButton: { en: "Join Community", zh: "加入社区", it: "Unisciti alla community" }
};

export default function Home() {
  const { i18n } = useDocusaurusContext();
  const currentLocale = i18n.currentLocale;
  const isZh = currentLocale === "zh";
  const [starsCount, setStarsCount] = useState(3100);
  // Static: Docker Hub's API sends no CORS header, so it cannot be read from the browser.
  const dockerPulls = 325000;
  const kubernetesLogo = useBaseUrl("img/kubernetes-logo.svg");
  const hamiLogo = useBaseUrl("img/hami-graph-color.svg");
  const hamiHorizontalLogoLight = useBaseUrl("img/hami-horizontal-color-black.svg");
  const hamiHorizontalLogoDark = useBaseUrl("img/hami-horizontal-color-white.svg");
  const contributorsCount = useCountUp(500);
  const contributorCountries = useCountUp(27);
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
              entry.target.dataset.revealScale ? styles.revealVisibleScale : styles.revealVisible,
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchGitHubStars = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/Project-HAMi/HAMi", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.stargazers_count === "number") {
          setStarsCount(data.stargazers_count);
        }
      } catch (error) {
        // Keep fallback value when API is unavailable.
      }
    };

    fetchGitHubStars();

    return () => controller.abort();
  }, []);

  return (
    <Layout
      title={pickLocalized(currentLocale, heroCopy.title)}
      description={pickLocalized(currentLocale, heroCopy.description)}
    >
      <main>
        <section className={clsx(styles.hero, "hami-shell-bg")}>
          <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
              <div>
                <div className={styles.badges}>
                  {heroStats.map((item) => (
                    <span key={item.key} className="hami-pill">
                      <strong>
                        {typeof item.label === "object"
                          ? pickLocalized(currentLocale, item.label)
                          : item.label}
                        :
                      </strong>
                      &nbsp;
                      {typeof item.value === "object"
                        ? pickLocalized(currentLocale, item.value)
                        : item.value}
                    </span>
                  ))}
                </div>
                <h1 className={styles.heroTitle}>
                  {pickLocalized(currentLocale, heroCopy.title)}
                </h1>
                <p className={styles.heroSubtitle}>
                  {pickLocalized(currentLocale, heroCopy.description)}
                </p>
                <div className={styles.heroFeatureChips}>
                  {pickLocalized(currentLocale, heroCopy.featureChips).map((chip) => (
                    <span key={chip} className={styles.heroFeatureChip}>
                      {chip}
                    </span>
                  ))}
                </div>
                <div className={styles.heroActions}>
                  <Link
                    className="button button--primary button--lg"
                    to={useBaseUrl("/docs/get-started/deploy-with-helm")}
                  >
                    {pickLocalized(currentLocale, heroCopy.quickStart)}
                  </Link>
                  <Link className="button button--outline button--lg" to={useBaseUrl("/community")}>
                    {pickLocalized(currentLocale, heroCopy.joinCommunity)}
                  </Link>
                </div>
              </div>
              <div className={styles.heroVisual}>
                <div
                  className={styles.ecosystemDiagram}
                  role="img"
                  aria-label={pickLocalized(currentLocale, heroCopy.ariaLabel)}
                >
                  <div className={styles.ecosystemStack}>
                    <section className={clsx(styles.ecoLayer, styles.ecoLayerWorkloads)}>
                      <h3>{pickLocalized(i18n.currentLocale, heroDiagramCopy.workloads)}</h3>
                      <div className={styles.ecoLogoGrid}>
                        {heroWorkloadEcosystem.map((item) => (
                          <div key={item.key} className={styles.ecoLogoChip}>
                            {item.logo ? (
                              <img
                                src={useBaseUrl(item.logo)}
                                alt={pickLocalizedOrRaw(i18n.currentLocale, item.label)}
                              />
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
                          <h3>
                            {pickLocalized(i18n.currentLocale, heroDiagramCopy.schedulerEcosystem)}
                          </h3>
                          <div className={styles.schedulerEcosystemGrid}>
                            {heroSchedulerEcosystem.map((item) => (
                              <div key={item.key} className={styles.ecoLogoChip}>
                                <img
                                  src={useBaseUrl(item.logo)}
                                  alt={pickLocalizedOrRaw(i18n.currentLocale, item.label)}
                                />
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className={styles.hamiCenterLayer}>
                          <section className={styles.hamiPlatformBlock}>
                            <h3 className={styles.hamiTitle}>
                              <img
                                src={hamiHorizontalLogoLight}
                                alt={pickLocalized(i18n.currentLocale, heroDiagramCopy.hamiLogoAlt)}
                                className={styles.hamiLogoLight}
                              />
                              <img
                                src={hamiHorizontalLogoDark}
                                alt={pickLocalized(i18n.currentLocale, heroDiagramCopy.hamiLogoAlt)}
                                className={styles.hamiLogoDark}
                              />
                            </h3>
                            <p>{pickLocalized(i18n.currentLocale, heroDiagramCopy.capabilities)}</p>
                            <section
                              className={styles.gpuSliceRow}
                              aria-label={pickLocalized(
                                i18n.currentLocale,
                                heroDiagramCopy.gpuSlicing,
                              )}
                            >
                              {heroGpuSlices.map((slice, index) => (
                                <React.Fragment key={slice}>
                                  <div className={styles.gpuSliceChip}>
                                    <span className={styles.gpuSliceIcon} aria-hidden="true" />
                                    <span>{slice}</span>
                                  </div>
                                  {index < heroGpuSlices.length - 1 && (
                                    <span className={styles.gpuSliceArrow} aria-hidden="true">
                                      →
                                    </span>
                                  )}
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
                            <strong>
                              {pickLocalized(i18n.currentLocale, heroDiagramCopy.allocatedDevices)}
                            </strong>
                            <p>
                              {pickLocalized(
                                i18n.currentLocale,
                                heroDiagramCopy.allocatedDevicesDesc,
                              )}
                            </p>
                          </div>
                        </div>
                        <div className={styles.observabilityMetric}>
                          <span className={styles.observabilityIcon} aria-hidden="true">
                            <FontAwesomeIcon icon={faChartLine} />
                          </span>
                          <div>
                            <strong>
                              {pickLocalized(i18n.currentLocale, heroDiagramCopy.realTimeUsage)}
                            </strong>
                            <p>
                              {pickLocalized(i18n.currentLocale, heroDiagramCopy.realTimeUsageDesc)}
                            </p>
                          </div>
                        </div>
                        <div className={styles.observabilityLogoRow}>
                          <div className={styles.ecoLogoChip}>
                            <img
                              src={useBaseUrl("img/ecosystem/prometheus.svg")}
                              alt="Prometheus"
                            />
                          </div>
                          <div className={styles.ecoLogoChip}>
                            <img
                              src={useBaseUrl("img/ecosystem/opentelemetry.svg")}
                              alt="OpenTelemetry"
                            />
                          </div>
                        </div>
                      </aside>
                    </section>

                    <section className={clsx(styles.ecoLayer, styles.ecoLayerDevices)}>
                      <h3>
                        {pickLocalized(
                          i18n.currentLocale,
                          heroDiagramCopy.heterogeneousAccelerators,
                        )}
                      </h3>
                      <div className={styles.ecoLogoGrid}>
                        {heroDeviceEcosystem.map((item) => (
                          <div key={item.key} className={styles.ecoLogoChip}>
                            <img
                              src={useBaseUrl(item.logo)}
                              alt={pickLocalizedOrRaw(i18n.currentLocale, item.label)}
                            />
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
                  <img
                    src={useBaseUrl("img/cncf-color.svg")}
                    alt="CNCF logo"
                    className={styles.cncfFeatureLogoLight}
                  />
                </div>
                <div className={styles.cnaiLogoBox}>
                  <img
                    src={useBaseUrl("img/ecosystem/cnai.svg")}
                    alt="CNAI Landscape logo"
                    className={styles.cnaiLogo}
                  />
                </div>
              </div>
              <div className={styles.cncfFeatureBody}>
                <span className={styles.cncfEyebrow}>
                  {pickLocalized(currentLocale, cncfCopy.eyebrow)}
                </span>
                <h2 className={styles.cncfFeatureTitle}>
                  {pickLocalized(currentLocale, cncfCopy.title)}
                </h2>
                <p className={styles.cncfFeatureText}>
                  {pickLocalized(currentLocale, cncfCopy.text)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section ref={addRevealRef} id="why" className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{pickLocalized(currentLocale, whyAndArchCopy.whyTitle)}</h2>
            <div className={styles.cardGrid}>
              {valueCards.map((card) => {
                const icon = cardIcons[card.icon] ?? fallbackCardIcon;
                const isKubernetesCard = card.icon === "kubernetes";
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
            <h2 className={styles.sectionTitle}>
              {pickLocalized(currentLocale, whyAndArchCopy.archTitle)}
            </h2>
            <p className={styles.sectionLead}>
              {pickLocalized(currentLocale, architectureSectionCopy.lead)}
            </p>

            <div className={styles.architectureOverview}>
              <article
                ref={addRevealRef}
                data-reveal-scale="1"
                className={clsx(styles.runtimeMechanism, styles.reveal)}
                aria-label={pickLocalized(currentLocale, whyAndArchCopy.runtimeDiagramAria)}
              >
                <div
                  className={styles.runtimeDiagramFrame}
                  role="img"
                  aria-label={pickLocalized(currentLocale, whyAndArchCopy.runtimeDiagramAria)}
                >
                  <h3 className={styles.runtimeDiagramTitle}>
                    {pickLocalized(i18n.currentLocale, runtimeDiagramCopy.title)}
                  </h3>
                  <section className={styles.runtimeStage} data-runtime-part="entry">
                    <span className={styles.runtimeSectionLabel}>
                      {pickLocalized(i18n.currentLocale, runtimeDiagramCopy.entryLabel)}
                    </span>
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
                    <span className={styles.runtimeResourcesLabel}>
                      {pickLocalized(currentLocale, whyAndArchCopy.resourceSemantics)}
                    </span>
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
            <h2 className={styles.sectionTitle}>
              {pickLocalized(currentLocale, whyAndArchCopy.beforeAfterTitle)}
            </h2>
            <p className={styles.sectionLead}>
              {pickLocalized(currentLocale, whyAndArchCopy.beforeAfterLead)}
            </p>

            <div
              ref={addRevealRef}
              data-reveal-scale="1"
              className={clsx(styles.reveal, styles.beforeAfterWrapper)}
            >
              <BeforeAfterComparison isZh={isZh} showHeader={false} />
            </div>
          </div>
        </section>

        <section
          ref={addRevealRef}
          className={clsx(styles.section, styles.sectionAlt, styles.reveal)}
        >
          <div className="container">
            <h2 className={styles.sectionTitle}>
              {pickLocalized(currentLocale, footerSectionsCopy.ecosystemTitle)}
            </h2>
            <p className={styles.sectionLead}>
              {pickLocalized(currentLocale, footerSectionsCopy.ecosystemLead)}
            </p>
            <div className={styles.supportersWrap}>
              <ul
                className="support-wrapper"
                aria-label={pickLocalized(currentLocale, footerSectionsCopy.ecosystemAria)}
              >
                {vendorEcosystem.map((vendor) => (
                  <li key={vendor.key}>
                    <a
                      href={vendor.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adopter-card-link"
                    >
                      {vendor.logo && <img src={useBaseUrl(vendor.logo)} alt={vendor.name} />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              className={clsx(styles.inlineLink, styles.supportDocsLink)}
              to={useBaseUrl("/docs/userguide/device-supported")}
            >
              {pickLocalized(currentLocale, footerSectionsCopy.ecosystemLink)}
            </Link>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{pickLocalized(currentLocale, footerSectionsCopy.compatTitle)}</h2>
            <p className={styles.sectionLead}>
              {pickLocalized(currentLocale, footerSectionsCopy.compatLead)}
            </p>
            <div className={styles.supportersWrap}>
              <LogoWall items={ecosystemData} imgPrefix="/img/ecosystem" />
            </div>
          </div>
        </section>

        <section ref={addRevealRef} className={clsx(styles.section, styles.reveal)}>
          <div className="container">
            <h2 className={styles.sectionTitle}>{pickLocalized(currentLocale, footerSectionsCopy.adoptersTitle)}</h2>
            <p className={styles.sectionLead}>
              {pickLocalized(currentLocale, footerSectionsCopy.adoptersLead)}
            </p>
            <div className={styles.supportersWrap}>
              <LogoWall items={adoptersData} imgPrefix="/img/adopters" />
            </div>
            <article className={styles.adoptersCta}>
              <h3 className={styles.adoptersCtaTitle}>
                {pickLocalized(currentLocale, footerSectionsCopy.adoptersCtaTitle)}
              </h3>
              <p className={styles.adoptersCtaText}>
                {pickLocalized(currentLocale, footerSectionsCopy.adoptersCtaText)}
              </p>
              <a
                className={clsx("button", "button--primary", styles.adoptersCtaButton)}
                href="https://github.com/Project-HAMi/HAMi/issues/4"
                target="_blank"
                rel="noreferrer"
              >
                {pickLocalized(currentLocale, footerSectionsCopy.adoptersCtaButton)}
              </a>
            </article>
          </div>
        </section>

        <section
          ref={addRevealRef}
          className={clsx(styles.section, styles.sectionAlt, styles.reveal)}
        >
          <div className="container">
            <h2 className={styles.sectionTitle}>{pickLocalized(currentLocale, footerSectionsCopy.contributorsTitle)}</h2>
            <p className={styles.sectionLead}>
              {pickLocalized(currentLocale, footerSectionsCopy.contributorsLead)}
            </p>
            <div className={styles.supportersWrap}>
              <ContributorsList />
            </div>
            <div className={styles.communityMetricsHeader}>
              <h3 className={styles.communityMetricsTitle}>
                {pickLocalized(currentLocale, footerSectionsCopy.metricsTitle)}
              </h3>
              <p className={styles.communityMetricsDesc}>
                {pickLocalized(currentLocale, footerSectionsCopy.metricsLead)}
              </p>
            </div>
            <div className={styles.communityMetricsRow}>
              <article className={styles.communityMetricCard}>
                <div className={styles.communityMetricHead}>
                  <span className={styles.communityMetricIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={faStar} />
                  </span>
                  <strong>GitHub Stars</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={pickLocalized(currentLocale, metricsCopy.starsSource)}
                    aria-label={pickLocalized(currentLocale, metricsCopy.starsAria)}
                  >
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
                  <strong>{pickLocalized(currentLocale, metricsCopy.dockerLabel)}</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={DOCKER_IMAGE_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={pickLocalized(currentLocale, metricsCopy.dockerSource)}
                    aria-label={pickLocalized(currentLocale, metricsCopy.dockerAria)}
                  >
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
                  <strong>{pickLocalized(currentLocale, metricsCopy.contributorsLabel)}</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={DEVSTATS_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={pickLocalized(currentLocale, metricsCopy.contributorsSource)}
                    aria-label={pickLocalized(currentLocale, metricsCopy.contributorsAria)}
                  >
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
                  <strong>{isZh ? "贡献者国家" : "Contributor Countries"}</strong>
                  <a
                    className={styles.metricSourceHint}
                    href={DEVSTATS_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-source={isZh ? "数据来源：DevStats" : "Source: DevStats"}
                    aria-label={isZh ? "查看国家数据来源" : "View countries data source"}
                  >
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </a>
                </div>
                <span>{contributorCountries}</span>
              </article>
            </div>
            <div className={styles.communityMetricActions}>
              <a
                className={clsx("button", "button--primary")}
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
              >
                {isZh ? "给 HAMi 点个 Star" : "Star HAMi on GitHub"}
              </a>
              <Link className={clsx("button", "button--outline")} to={useBaseUrl("/community")}>
                {isZh ? "加入社区" : "Join Community"}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
