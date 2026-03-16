const caseStudiesData = [
  {
    name: 'KE Holdings Inc.',
    logo: '/img/case-studies/ke-holdings.png',
    publishedAt: '2026-02-05',
    metric: {
      en: '3x improvement in platform GPU utilization',
      zh: '平台 GPU 利用率提升 3 倍',
    },
    summary: {
      en: 'Scaling machine learning infrastructure with HAMi-based GPU virtualization on Kubernetes.',
      zh: '基于 Kubernetes 和 HAMi 的 GPU 虚拟化，支撑机器学习基础设施规模化。',
    },
    highlights: [
      {
        en: 'Improved overall cluster GPU efficiency under mixed workloads.',
        zh: '在混合负载下提升集群整体 GPU 资源效率。',
      },
      {
        en: 'Enabled faster rollout of AI features with more predictable scheduling.',
        zh: '通过更可预测的调度能力，加速 AI 功能上线。',
      },
    ],
    url: 'https://www.cncf.io/case-studies/ke-holdings/',
  },
  {
    name: 'DaoCloud',
    logo: '/img/case-studies/daocloud.svg',
    publishedAt: '2025-12-02',
    metric: {
      en: '>80% average GPU utilization after vGPU adoption',
      zh: '采用 vGPU 后，平均 GPU 利用率超过 80%',
    },
    summary: {
      en: 'Building a flexible GPU cloud with HAMi to increase utilization and improve delivery speed.',
      zh: '基于 HAMi 构建灵活 GPU 云，提升利用率并加快交付速度。',
    },
    highlights: [
      {
        en: 'GPU operating costs were reduced by around 50%.',
        zh: 'GPU 运营成本降低约 50%。',
      },
      {
        en: 'Typical environment delivery time dropped from about one day to around twenty minutes.',
        zh: '典型环境交付时间由约 1 天缩短至约 20 分钟。',
      },
    ],
    url: 'https://www.cncf.io/case-studies/daocloud/',
  },
  {
    name: 'SF Technology',
    logo: '/img/case-studies/sf-technology.svg',
    publishedAt: '2025-09-18',
    metric: {
      en: 'Up to 57% GPU savings for production and test clusters',
      zh: '生产与测试集群最高节省 57% GPU 成本',
    },
    summary: {
      en: 'Building a heterogeneous AI virtualization pooling solution (Effective GPU) with HAMi.',
      zh: '基于 HAMi 构建异构 AI 虚拟化资源池方案（Effective GPU）。',
    },
    highlights: [
      {
        en: 'Reduced GPU waste in both production and non-production environments.',
        zh: '在生产与非生产环境中降低 GPU 闲置浪费。',
      },
      {
        en: 'Improved utilization with a unified pool across heterogeneous accelerators.',
        zh: '通过异构加速器统一资源池，提升整体利用率。',
      },
    ],
    url: 'https://www.cncf.io/case-studies/sf-technology/',
  },
  {
    name: 'PREP EDU',
    logo: '/img/case-studies/prep.svg',
    publishedAt: '2025-08-20',
    metric: {
      en: '90% of GPU infrastructure optimized using HAMi',
      zh: '90% GPU 基础设施通过 HAMi 得到优化',
    },
    summary: {
      en: 'Improving AI inference orchestration with HAMi in education-focused workloads.',
      zh: '在教育场景 AI 推理业务中，借助 HAMi 优化资源编排。',
    },
    highlights: [
      {
        en: 'Most GPU infrastructure was standardized and optimized through HAMi.',
        zh: '多数 GPU 基础设施通过 HAMi 实现标准化与优化。',
      },
      {
        en: 'Strengthened stability and efficiency for inference-heavy traffic.',
        zh: '增强了推理型高并发流量下的稳定性与效率。',
      },
    ],
    url: 'https://www.cncf.io/case-studies/prep-edu/',
  },
];

export default caseStudiesData;
