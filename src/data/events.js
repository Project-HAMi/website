const events = [
  {
    slug: "kcd-vietnam",
    title: {
      en: "From Project to Production: HAMi and Viettel Cloud at KCD Vietnam",
      zh: "从项目到生产：HAMi 与 Viettel Cloud 亮相 KCD 越南",
    },
    date: "2026-07-25",
    speaker: "Reza Jelveh, The Anh Nguyen",
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
        url: "/resources/events/2026-kcd-vietnam/talk-slides.pdf",
      },
      communityFlyer: {
        en: "Community Flyer",
        zh: "社区宣传册",
        url: "/resources/events/flyers/community-flyer.pdf",
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
    speaker: "Jeonghyun Kim, Reza Jelveh",
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
        url: "/resources/events/flyers/community-flyer.pdf",
      },
      talkSlides: {
        en: "Talk Slides",
        zh: "演讲幻灯片",
        url: "/resources/events/2026-kubecon-japan/snow_corp_cncf.pdf",
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
        url: "/resources/events/flyers/community-flyer.pdf",
      },
      talkSlides: {
        en: "Talk Slides",
        zh: "演讲幻灯片",
        url: "/resources/events/2026-coscup/coscup_2026.pdf",
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
  {
    slug: "opensource-summit-korea",
    title: {
      en: "Simplifying AI for Edge Compute with HAMi",
      zh: "使用 HAMi 简化边缘计算中的 AI",
    },
    date: "2026-08-12",
    startTime: "11:40",
    endTime: "12:10",
    timeZone: "KST",
    location: {
      en: "Grand InterContinental Seoul Parnas",
      zh: "首尔柏纳斯大洲际酒店",
    },
    address: {
      addressLocality: "Seoul",
      addressCountry: "KR",
      streetAddress: "521 Teheran-ro Gangnam-gu, 06164",
    },
    description: {
      en: "Open-source agents like Hermes and OpenClaw can reason and use tools, but edge deployment is still hard - not the model, the compute underneath: limited memory, tight power budgets, no ops team. Democratizing agentic AI means fixing the compute layer. This deep dive covers GPU and memory slicing at the edge: carving one device's unified memory so multiple agents run concurrently on hardware as small as an NVIDIA Jetson, and time-sharing when demand exceeds memory. We compare Jetson-class GPUs with NPUs from Axelera and DeepX - higher performance per watt - and what it takes to make them schedulable. HAMi, the CNCF Incubation project for hardware-agnostic GPU virtualization, is that layer: one scheduling plane across heterogeneous accelerators, fine-grained memory slicing, open source. A blueprint for edge AI without a cloud budget.",
      zh: "开源智能体（如 Hermes 和 OpenClaw）能够推理并使用工具，但边缘部署仍然困难——问题不在模型，而在底层的算力：内存有限、功耗预算紧张、没有运维团队。让智能体 AI 普及化，关键在于修复算力层。本次深度解析涵盖边缘 GPU 与显存切片：将一块设备的统一内存切分，让多个智能体在 NVIDIA Jetson 这样的小型硬件上并发运行，并在内存不足时进行时间共享。我们对比 Jetson 级 GPU 与 Axelera、DeepX 的 NPU——每瓦性能更高——以及让它们可被调度的必要条件。HAMi 是 CNCF 孵化项目，提供与硬件无关的 GPU 虚拟化，正是这一层：跨异构加速器的统一调度平面、细粒度显存切片、开源。一份无需云预算的边缘 AI 蓝图。",
    },
    resources: {
      communityFlyer: {
        en: "Community Flyer",
        zh: "社区宣传册",
        url: "/resources/events/flyers/community-flyer.pdf",
      },
      talkSlides: {
        en: "Talk Slides",
        zh: "演讲幻灯片",
        url: "/resources/events/2026-ossummit-korea/ossummit_korea.pdf",
      },
    },
    cta: {
      discordUrl: "https://go.dynamia.ai/hami-chat-korea",
      githubUrl: "https://go.dynamia.ai/proj-hami-korea",
    },
    externalUrl: "https://events.linuxfoundation.org/open-source-summit-korea/",
    talkUrl: "https://events.linuxfoundation.org/open-source-summit-korea/program/schedule/",
  },
  {
    slug: "hami-meetup-shanghai",
    title: {
      en: "HAMi Meetup Shanghai 2026: Incubating Special Event",
      zh: "「不卷算力，卷效率」HAMi Meetup 上海站 · Incubating 特别活动",
    },
    date: "2026-09-06",
    startTime: "14:00",
    endTime: "17:50",
    location: {
      en: "Wujiaochang, Shanghai, China",
      zh: "中国 上海 五角场",
    },
    address: {
      addressLocality: "Shanghai",
      addressCountry: "CN",
    },
    banner: "/img/events/2026-hami-meetup-shanghai/hami-meetup-shanghai-sept.jpg",
    description: {
      en: 'The first offline special event since HAMi was accepted as a CNCF Incubating project. On the afternoon of September 6, join us in Shanghai for technical talks, a community panel, and the Incubating milestone session under the theme "race efficiency, not compute", followed by a Community Night in the evening. Free registration, a warm-up ahead of KubeCon China 2026.',
      zh: "HAMi 晋级 CNCF 孵化项目后的首场线下特别活动。9 月 6 日下午，主题演讲、社区圆桌与 Incubating 里程碑环节将围绕「不卷算力，卷效率」展开，晚间为 HAMi Community Night。活动免费报名，正值 KubeCon China 2026 开幕前夕，欢迎顺路相聚上海。",
    },
    price: 0,
    priceCurrency: "CNY",
    cta: {
      discordUrl: "https://go.dynamia.ai/hami-chat",
    },
    externalUrl: "https://www.huodongxing.com/event/2874911381700",
  },
  {
    slug: "kubecon-china",
    title: {
      en: "HAMi at KubeCon China 2026",
      zh: "HAMi 亮相 KubeCon China 2026",
    },
    date: "2026-09-07",
    endDate: "2026-09-09",
    speaker: "Jifei Wang, Mengxuan Li, Walter Duan",
    location: {
      en: "Shanghai International Convention Center, Shanghai, China",
      zh: "中国 上海 上海国际会议中心",
    },
    address: {
      addressLocality: "Shanghai",
      addressCountry: "CN",
    },
    banner: "/img/events/2026-kubecon-china/hami-at-kubecon-china-2026.png",
    description: {
      en: "HAMi's first KubeCon China appearance as a CNCF Incubating project. All HAMi activities are on September 8: a keynote on llm-d support for heterogeneous environments (09:12-09:22, Grand Ballroom II + III), a lightning talk on scheduling-driven dynamic MIG (11:14-11:19, 5B + C), and a session on Intsig's billion-document GPU virtualization at scale (14:30-15:00, Grand Ballroom II + III). Booth T-1 in Grand Ballroom I is staffed by maintainers from 10:30 to 19:00. Stop by to talk GPU sharing, scheduling, and multi-tenant GPU management.",
      zh: "HAMi 晋级 CNCF 孵化项目后首次亮相 KubeCon China。全部活动集中在 9 月 8 日：上午 Keynote 介绍 llm-d 对异构环境的支持（09:12-09:22，Grand Ballroom II + III），午间闪电演讲分享调度驱动的动态 MIG 方案（11:14-11:19，5B + C），下午带来合合信息千卡规模 GPU 虚拟化生产实践（14:30-15:00，Grand Ballroom II + III）。展台 T-1（Grand Ballroom I）10:30 至 19:00 维护者现场值守，欢迎来聊 GPU 共享、调度与多租户管理。",
    },
    resources: {
      communityFlyer: {
        en: "Community Flyer",
        zh: "社区宣传册",
        url: "/resources/events/flyers/community-flyer.pdf",
      },
    },
    cta: {
      discordUrl: "https://go.dynamia.ai/hami-chat",
    },
    externalUrl:
      "https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/",
    talkUrl:
      "https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/program/schedule/",
  },
];

export default events;
