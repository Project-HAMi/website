const valueCards = [
  {
    id: "heterogeneous-management",
    icon: "network-wired",
    title: {
      en: "Heterogeneous Management",
      zh: "统一管理异构设备复用",
      it: "Gestione eterogenea",
    },
    description: {
      en: "Manage and schedule GPU, NPU, MLU, and other accelerators in one workflow.",
      zh: "通过统一的 Kubernetes 原生工作流调度 GPU、NPU、MLU 等异构加速设备。",
      it: "Gestisci e pianifica GPU, NPU, MLU e altri acceleratori in un unico workflow.",
    },
  },
  {
    id: "hard-isolation",
    icon: "shield-halved",
    title: {
      en: "Hard Isolation",
      zh: "细粒度切分与硬隔离",
      it: "Isolamento forte",
    },
    description: {
      en: "Slice memory and compute precisely with hard isolation at runtime.",
      zh: "按显存与算力精细切分资源，并在运行时保持硬隔离。",
      it: "Suddividi la memoria e il calcolo con precisione grazie all'isolamento forte a runtime.",
    },
  },
  {
    id: "advanced-scheduling",
    icon: "gauge-high",
    title: {
      en: "Advanced Scheduling",
      zh: "动态控制与调度",
      it: "Scheduling avanzato",
    },
    description: {
      en: "Use binpack, spread, and topology-aware policies for better placement.",
      zh: "通过 binpack、spread 与拓扑感知策略优化资源放置。",
      it: "Usa policy di binpack, spread e topology-aware per un posizionamento migliore.",
    },
  },
  {
    id: "standards",
    icon: "kubernetes",
    title: {
      en: "Kubernetes Native",
      zh: "Kubernetes 原生",
      it: "Kubernetes Native",
    },
    description: {
      en: "Work with Kubernetes APIs, DRA, and CDI for easier adoption.",
      zh: "兼容 Kubernetes API、DRA 与 CDI 标准，降低接入成本。",
      it: "Lavora con le API di Kubernetes, DRA e CDI per un'adozione più semplice.",
    },
  },
  {
    id: "resource-qos",
    icon: "building-circle-check",
    title: {
      en: "Resource Isolation & QoS",
      zh: "资源隔离与 QoS",
      it: "Isolamento delle risorse e QoS",
    },
    description: {
      en: "Control memory and core quotas for fairer and more stable sharing.",
      zh: "精确控制显存与核心配额，提升共享公平性与稳定性。",
      it: "Controlla le quote di memoria e core per una condivisione più equa e stabile.",
    },
  },
  {
    id: "observability",
    icon: "chart-line",
    title: {
      en: "Unified Monitoring",
      zh: "统一监控与观测",
      it: "Monitoraggio unificato",
    },
    description: {
      en: "Provide consistent metrics and visibility across device vendors.",
      zh: "在多厂商设备上提供一致的指标体系与运维可见性。",
      it: "Fornisci metriche coerenti e visibilità tra i vari produttori di dispositivi.",
    },
  },
];

export default valueCards;
