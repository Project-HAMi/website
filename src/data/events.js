const events = [
  {
    slug: "kcd-vietnam",
    title: {
      en: "From Project to Production: HAMi and Viettel Cloud at KCD Vietnam",
      zh: "从项目到生产：HAMi 与 Viettel Cloud 亮相 KCD 越南",
    },
    date: "2026-07-25",
    location: {
      en: "Hanoi, Vietnam",
      zh: "越南 河内",
    },
    address: {
      addressLocality: "Hanoi",
      addressCountry: "VN",
      streetAddress: "Sheraton Hanoi Hotel, K5 Nghi Tam, 11 Xuan Dieu, Tay Ho",
    },
    banner:
      "/img/events/2026-kcd-vietnam/from-project-to-production-hami-and-viettel-cloud_jelveh-nguyen.jpeg",
    description: {
      en: "Kubernetes treats GPUs as atomic resources, forcing over-provisioning and low utilization in multi-tenant AI Notebooks. HAMi's vGPU virtualization and DRA solve this, but only if implemented correctly. This talk at KCD & OpenInfra Days Vietnam covers the mechanics of GPU sharing (DRA resource requests, HAMi fractional GPU allocation, memory isolation, compute slicing) and the production deployment at Viettel Cloud: architecture, bottlenecks, and operational realities of fractional GPUs for data science workloads at telco scale.",
      zh: "Kubernetes 将 GPU 视为原子资源，导致多租户 AI Notebook 中过度配置且利用率低下。HAMi 的 vGPU 虚拟化与 DRA 解决了这一问题——但前提是正确实施。本演讲涵盖 GPU 共享的机制（DRA 资源请求、HAMi 细粒度 GPU 分配、显存隔离、算力切片）以及 Viettel Cloud 的生产部署：架构、从测试到生产的关键瓶颈、以及电信级数据科学工作负载中 GPU 细粒度共享的运维实践。",
    },
    resources: {
      talkSlides: {
        en: "Talk Slides",
        zh: "演讲幻灯片",
        url: "/resources/2026-kcd-vietnam/talk-slides.pdf",
      },
      communityFlyer: {
        en: "Community Flyer",
        zh: "社区宣传册",
        url: "/resources/flyers/community-flyer.pdf",
      },
    },
    cta: {
      discordUrl: "https://go.dynamia.ai/hami-chat",
      githubUrl: "https://go.dynamia.ai/proj-hami-jpvn",
    },
    externalUrl: "https://2026.vietopeninfra.org/en/",
    talkUrl: "https://2026.vietopeninfra.org/en/#agenda",
  },
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
    address: {
      addressLocality: "Yokohama",
      addressRegion: "Kanagawa",
      addressCountry: "JP",
    },
    banner:
      "/img/events/2026-kubecon-jp/shared-gpu-scheduling-proactive-autoscaling-a-p_kim-jelveh.jpeg",
    description: {
      en: 'Join the HAMi team at KubeCon + CloudNativeCon Japan 2026, the CNCF\'s flagship conference. Visit our booth in the Solutions Showcase and catch our talk "Shared GPU Scheduling + Proactive Autoscaling" on orchestrating GPU workloads with HAMi on Kubernetes.',
      zh: "欢迎参加 KubeCon + CloudNativeCon 日本 2026，CNCF 旗舰大会。欢迎莅临 Solutions Showcase 展区 HAMi 展位，并聆听我们的演讲「共享 GPU 调度与主动自动伸缩」——基于 Kubernetes 与 HAMi 编排 GPU 工作负载。",
    },
    resources: {
      communityFlyer: {
        en: "Community Flyer",
        zh: "社区宣传册",
        url: "/resources/flyers/community-flyer.pdf",
      },
      talkSlides: {
        en: "Talk Slides",
        zh: "演讲幻灯片",
        url: "/resources/2026-kubecon-japan/snow_corp_cncf.pdf",
      },
    },
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
    externalUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-japan",
    talkUrl:
      "https://events.linuxfoundation.org/kubecon-cloudnativecon-japan/program/schedule/?id=1182713",
  },
  {
    slug: "coscup-2026",
    title: {
      en: "Running Multiple AI Workloads on One GPU with HAMi: Architecture and Gotchas",
      zh: "用 HAMi 在一块 GPU 上运行多个 AI 工作负载：架构与注意事项",
    },
    date: "2026-08-09",
    startTime: "11:20",
    endTime: "11:50",
    location: {
      en: "Taipei, Taiwan",
      zh: "中国台湾 台北",
    },
    resources: {
      communityFlyer: {
        en: "Community Flyer",
        zh: "社区宣传册",
        url: "/resources/flyers/community-flyer.pdf",
      },
      talkSlides: {
        en: "Talk Slides",
        zh: "演讲幻灯片",
        url: "/resources/2026-coscup/coscup_2026.pdf",
      },
    },
    cta: {
      discordUrl: "https://go.dynamia.ai/hami-chat-coscup",
      githubUrl: "https://go.dynamia.ai/proj-hami-coscup",
    },
    room: "TR214",
    description: {
      en: "GPUs are expensive. Kubernetes doesn't share them well yet, and DRA is still work in progress. HAMi brings heterogeneous GPU sharing to Kubernetes. This talk covers how HAMi hijacks CUDA calls without touching your application code, why memory isolation matters, and real production use cases where teams cut GPU costs by 40-60%.",
      zh: "GPU 很贵。Kubernetes 目前还无法很好地共享它们，DRA 仍在开发中。HAMi 为 Kubernetes 带来异构 GPU 共享。本演讲将介绍 HAMi 如何在不改动应用代码的情况下接管 CUDA 调用、为什么显存隔离至关重要，以及真实的生产用例——团队将 GPU 成本降低了 40-60%。",
    },
    externalUrl: "https://coscup.org/2026/en/",
    talkUrl: "https://coscup.org/2026/en/session/BGYZ3B",
  },
];

export default events;
