const events = [
  {
    slug: "kubecon-japan",
    title: {
      en: "HAMi at KubeCon Japan 2026",
      zh: "HAMi 亮相 KubeCon 日本 2026",
    },
    date: "2026-07-28",
    endDate: "2026-07-30",
    location: {
      en: "Yokohama, Japan",
      zh: "日本 横滨",
    },
    description: {
      en: 'Join the HAMi team at KubeCon + CloudNativeCon Japan 2026, the CNCF\'s flagship conference. Visit our booth in the Solutions Showcase and catch our talk "Shared GPU Scheduling + Proactive Autoscaling" on orchestrating GPU workloads with HAMi on Kubernetes.',
      zh: "欢迎参加 KubeCon + CloudNativeCon 日本 2026，CNCF 旗舰大会。欢迎莅临 Solutions Showcase 展区 HAMi 展位，并聆听我们的演讲「共享 GPU 调度与主动自动伸缩」——基于 Kubernetes 与 HAMi 编排 GPU 工作负载。",
    },
    resources: {},
    caseStudy: {
      company: "SNOW Corp.",
      companyZh: "SNOW",
      highlights: [
        {
          en: "2x fewer GPUs with HAMi GPU sharing, handling 700% traffic spikes",
          zh: "借助 HAMi GPU 共享减少 50% GPU 需求，从容应对 700% 流量洪峰",
        },
        {
          en: "USD 17.4M in estimated cost savings vs on-demand cloud GPU",
          zh: "相比等量按需云 GPU，预估节省 1740 万美元",
        },
        {
          en: "MTTR reduced by 91%; GPU surge errors dropped by 85%",
          zh: "MTTR 降低 91%；GPU 涌流错误减少 85%",
        },
      ],
      url: "https://www.cncf.io/case-studies/snow-corp/",
    },
    cta: {
      discordUrl: "https://go.dynamia.ai/hami-chat",
      githubUrl: "https://go.dynamia.ai/proj-hami-jpvn",
    },
  },
];

export default events;
