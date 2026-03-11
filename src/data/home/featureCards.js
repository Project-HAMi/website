const featureCards = [
  {
    id: 'k8s-native',
    icon: 'cubes-stacked',
    title: { en: 'Kubernetes Native', zh: 'Kubernetes 原生兼容' },
    description: {
      en: 'Zero-change adoption path with Kubernetes-compatible APIs and deployment model.',
      zh: '兼容 Kubernetes API 与部署模型，支持零改造接入。',
    },
  },
  {
    id: 'vendor-neutral',
    icon: 'building-circle-check',
    title: { en: 'Open and Vendor Neutral', zh: '开放中立，避免锁定' },
    description: {
      en: 'Community-driven governance and hardware ecosystem support for diverse environments.',
      zh: '社区治理驱动，支持多硬件生态与多样化运行环境。',
    },
  },
  {
    id: 'resource-qos',
    icon: 'gauge-high',
    title: { en: 'Resource Isolation & QoS', zh: '资源隔离与 QoS' },
    description: {
      en: 'Control memory/core usage to improve fairness, reliability and utilization.',
      zh: '控制显存与核心配额，提升任务公平性、稳定性与利用率。',
    },
  },
  {
    id: 'observability',
    icon: 'chart-line',
    title: { en: 'Unified Monitoring', zh: '统一监控与观测' },
    description: {
      en: 'Provide consistent metrics and operational visibility across device vendors.',
      zh: '在多厂商设备上提供一致的指标体系和运维可见性。',
    },
  },
];

export default featureCards;
