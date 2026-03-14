const valueCards = [
  {
    id: 'heterogeneous-management',
    icon: 'network-wired',
    title: {
      en: 'Heterogeneous Management',
      zh: '统一管理异构设备复用',
    },
    description: {
      en: 'Manage and schedule GPU, NPU, MLU, and other accelerators in one workflow.',
      zh: '通过统一的 Kubernetes 原生工作流调度 GPU、NPU、MLU 等异构加速设备。',
    },
  },
  {
    id: 'hard-isolation',
    icon: 'shield-halved',
    title: {
      en: 'Hard Isolation',
      zh: '细粒度切分与硬隔离',
    },
    description: {
      en: 'Slice memory and compute precisely with hard isolation at runtime.',
      zh: '按显存与算力精细切分资源，并在运行时保持硬隔离。',
    },
  },
  {
    id: 'advanced-scheduling',
    icon: 'gauge-high',
    title: {
      en: 'Advanced scheduling',
      zh: '动态控制与调度',
    },
    description: {
      en: 'Use binpack, spread, and topology-aware policies for better placement.',
      zh: '通过 binpack、spread 与拓扑感知策略优化资源放置。',
    },
  },
  {
    id: 'standards',
    icon: 'kubernetes',
    title: {
      en: 'Kubernetes native',
      zh: 'Kubernetes 原生',
    },
    description: {
      en: 'Work with Kubernetes APIs, DRA, and CDI for easier adoption.',
      zh: '兼容 Kubernetes API、DRA 与 CDI 标准，降低接入成本。',
    },
  },
  {
    id: 'resource-qos',
    icon: 'building-circle-check',
    title: {
      en: 'Resource Isolation & QoS',
      zh: '资源隔离与 QoS',
    },
    description: {
      en: 'Control memory and core quotas for fairer and more stable sharing.',
      zh: '精确控制显存与核心配额，提升共享公平性与稳定性。',
    },
  },
  {
    id: 'observability',
    icon: 'chart-line',
    title: {
      en: 'Unified Monitoring',
      zh: '统一监控与观测',
    },
    description: {
      en: 'Provide consistent metrics and visibility across device vendors.',
      zh: '在多厂商设备上提供一致的指标体系与运维可见性。',
    },
  },
];

export default valueCards;
