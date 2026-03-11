const valueCards = [
  {
    id: 'multiplex',
    icon: 'cubes-stacked',
    title: {
      en: 'Unified multiplexing across heterogeneous devices',
      zh: '统一管理异构设备复用',
    },
    description: {
      en: 'Use one Kubernetes-native workflow to schedule GPU, NPU, MLU and other AI accelerators.',
      zh: '通过 Kubernetes 原生方式统一调度 GPU、NPU、MLU 等多种 AI 加速设备。',
    },
  },
  {
    id: 'sharing',
    icon: 'shield-halved',
    title: {
      en: 'Fine-grained slicing and hard isolation',
      zh: '细粒度切分与硬隔离',
    },
    description: {
      en: 'Allocate memory/core slices precisely for training and inference jobs in mixed workloads, with hard isolation enforced at runtime.',
      zh: '针对训练和推理混部场景，按显存/算力精细切分资源，并在运行时实施硬隔离。',
    },
  },
  {
    id: 'isolation',
    icon: 'gauge-high',
    title: {
      en: 'Dynamic controls and scheduling',
      zh: '动态控制与调度',
    },
    description: {
      en: 'Supports binpack, spread, node-topology-aware, and task-topology-aware scheduling policies to optimize resource utilization and placement.',
      zh: '支持 binpack、spread、节点拓扑感知、任务拓扑感知等调度策略，优化资源利用率与整体调度效果。',
    },
  },
  {
    id: 'standards',
    icon: 'building-circle-check',
    title: {
      en: 'Aligned with Kubernetes standards (DRA/CDI)',
      zh: '对齐 Kubernetes 标准（DRA/CDI）',
    },
    description: {
      en: 'Build on standard interfaces to avoid lock-in and simplify long-term platform evolution.',
      zh: '基于标准接口减少厂商锁定，降低平台长期演进成本。',
    },
  },
];

export default valueCards;
