// Which NVIDIA GPU features each HAMi setup supports, checked against source code in October 2026:
// HAMi 0af48d62, HAMi-DRA 102c9f1 with k8s-dra-driver 300224a, Volcano 527d8fee2 with
// volcano-vgpu-device-plugin 5283c86, KAI-Scheduler e496b75 with KAI-resource-isolator 09c0bb9.
// status: "yes" supported, "partial" works with a caveat the reader should know, "no" not supported.
// use: a string lists identifiers (comma separated, shown as code); an { en, zh } object is prose.
// use can also be a list of { label, code } when identifiers play different roles.
// short: the label shown beside the identifiers in a card.
// guide: where this setup documents the feature, { href, label? }; href may be { en, zh } when
// heading anchors differ by locale. Left out when the page itself covers it or no doc does.

// Paired identifiers whose roles differ; the card shows each with its role.
const pickAvoid = (pick, avoid) => [
  { label: { en: "Pick", zh: "指定" }, code: pick },
  { label: { en: "Avoid", zh: "排除" }, code: avoid },
];
const endpointMetrics = (endpoint, metrics) => [
  { label: { en: "Endpoint", zh: "端点" }, code: endpoint },
  { label: { en: "Metrics", zh: "指标" }, code: metrics },
];
const clusterOrPod = (cluster, pod) => [
  { label: { en: "Cluster", zh: "全局" }, code: cluster },
  { label: { en: "Per Pod", zh: "按 Pod" }, code: pod },
];

// Site pages, with anchors as generated from each locale's headings.
const DRA_COMPAT = {
  href: {
    en: "/docs/installation/how-to-use-hami-dra#deviceplugin-compatible-mode",
    zh: "/docs/installation/how-to-use-hami-dra#deviceplugin-兼容模式",
  },
};
const VOLCANO_JOBS = {
  href: {
    en: "/docs/userguide/volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu#running-vgpu-jobs",
    zh: "/docs/userguide/volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu#运行-vgpu-作业",
  },
};

const volcanoDoc = (anchor, label) => ({
  href: `https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_volcano_vgpu.md#${anchor}`,
  label,
});
const kaiDoc = (path, label) => ({
  href: `https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/${path}`,
  label,
});

const KAI_PLACEMENT = kaiDoc(
  "operator/scheduler-config-customization.md#independent-node-level-and-device-level-placement",
  { en: "KAI docs: node and device placement", zh: "KAI 文档：节点级与卡级策略" },
);
const VOLCANO_POLICY = volcanoDoc("common-requirements", {
  en: "Volcano docs: scheduler config",
  zh: "Volcano 文档：调度器配置",
});

export const COMPONENTS = {
  hami: {
    name: "HAMi",
    full: { en: "HAMi (Device Plugin)", zh: "HAMi（Device Plugin 模式）" },
  },
  dra: {
    name: "HAMi-DRA",
    full: { en: "HAMi-DRA", zh: "HAMi-DRA" },
  },
  volcano: {
    name: "Volcano vGPU",
    full: { en: "Volcano vGPU", zh: "Volcano vGPU" },
  },
  kai: {
    name: "KAI",
    full: { en: "KAI Scheduler with HAMi\u2011core", zh: "KAI Scheduler 搭配 HAMi\u2011core" },
  },
};

export const FEATURES = {
  memMib: {
    title: { en: "Memory in MiB", zh: "按 MiB 分配显存" },
    short: { en: "In MiB", zh: "按 MiB" },
    hami: { status: "yes", use: "nvidia.com/gpumem" },
    dra: { status: "yes", use: "nvidia.com/gpumem", guide: DRA_COMPAT },
    volcano: { status: "yes", use: "volcano.sh/vgpu-memory", guide: VOLCANO_JOBS },
    kai: {
      status: "yes",
      use: { en: "gpu-memory annotation", zh: "gpu-memory 注解" },
      guide: {
        href: {
          en: "/docs/userguide/kai-scheduler/how-to-use-kai-scheduler#3-schedule-an-isolated-gpu-pod",
          zh: "/docs/userguide/kai-scheduler/how-to-use-kai-scheduler#3-调度一个隔离的-gpu-pod",
        },
      },
    },
  },
  memPercent: {
    title: { en: "Memory by percentage", zh: "按百分比分配显存" },
    short: { en: "By percent", zh: "按百分比" },
    hami: { status: "yes", use: "nvidia.com/gpumem-percentage" },
    dra: {
      status: "no",
      note: {
        en: "The claim is created before scheduling, when the GPU is not known yet, so a percentage cannot be turned into bytes. The Pod stays Pending without an error.",
        zh: "Pod 创建时就要生成 claim，这时还不知道会分到哪张卡，算不出百分比对应多少显存。Pod 会一直 Pending，也不报错。",
      },
    },
    volcano: {
      status: "no",
      note: {
        en: "Since Volcano v1.13.0, Pods fail to schedule with insufficient resources: the generic resource check expects the node to report this resource, but the device plugin does not. Contributions to fix it are welcome.",
        zh: "Volcano v1.13.0 起会因资源不足调度失败：通用资源检查要求节点上有这个资源，但设备插件没有上报它。欢迎贡献修复。",
      },
    },
    kai: {
      status: "yes",
      use: { en: "gpu-fraction annotation", zh: "gpu-fraction 注解" },
      guide: kaiDoc("gpu-sharing/README.md#request-a-gpu-portion", {
        en: "KAI docs: request a GPU portion",
        zh: "KAI 文档：按比例申请",
      }),
    },
  },
  cores: {
    title: { en: "Compute limit", zh: "限制算力" },
    short: { en: "Cores", zh: "算力" },
    hami: {
      status: "yes",
      use: "nvidia.com/gpucores",
      note: {
        en: "By default throttling starts only when another Pod shares the GPU.",
        zh: "默认只在同卡有其他 Pod 时才开始限流。",
      },
    },
    dra: {
      status: "yes",
      use: "nvidia.com/gpucores",
      note: {
        en: "If omitted, the Pod reserves 100% of the cores and no other Pod fits on that GPU.",
        zh: "不写时默认占满 100% 算力，同卡放不下其他 Pod。",
      },
      guide: DRA_COMPAT,
    },
    volcano: { status: "yes", use: "volcano.sh/vgpu-cores", guide: VOLCANO_JOBS },
    kai: {
      status: "no",
      note: { en: "Pods on the same GPU compete for compute.", zh: "同卡 Pod 之间会争抢算力。" },
    },
  },
  exclusive: {
    title: { en: "Whole GPU", zh: "独占整卡" },
    short: { en: "Whole GPU", zh: "整卡" },
    hami: { status: "yes", use: "nvidia.com/gpu" },
    dra: { status: "yes", use: "nvidia.com/gpu", guide: DRA_COMPAT },
    volcano: {
      status: "yes",
      use: "volcano.sh/vgpu-number",
      guide: { href: "/docs/userguide/volcano-vgpu/nvidia-gpu/examples/use-exclusive-gpu" },
    },
    kai: {
      status: "yes",
      use: "nvidia.com/gpu",
    },
  },
  gpuType: {
    title: { en: "Choose GPU by type", zh: "按型号选卡" },
    short: { en: "Type", zh: "型号" },
    hami: {
      status: "yes",
      use: pickAvoid("nvidia.com/use-gputype", "nvidia.com/nouse-gputype"),
    },
    dra: {
      status: "partial",
      use: pickAvoid("nvidia.com/use-gputype", "nvidia.com/nouse-gputype"),
      note: {
        en: "Exact, case-sensitive match on the full product name. A100 alone matches nothing.",
        zh: "按完整型号名精确匹配并区分大小写，只写 A100 匹配不到。",
      },
    },
    volcano: {
      status: "yes",
      use: pickAvoid("nvidia.com/use-gputype", "nvidia.com/nouse-gputype"),
    },
    kai: {
      status: "partial",
      use: {
        en: "nodeSelector on nvidia.com/gpu.product",
        zh: "用 nodeSelector 选 nvidia.com/gpu.product",
      },
      note: {
        en: "Picks nodes, not GPUs within a node, and cannot exclude a type.",
        zh: "只能选节点，不能在节点内挑卡，也不能排除某种型号。",
      },
    },
  },
  gpuUuid: {
    title: { en: "Choose GPU by UUID", zh: "按 UUID 选卡" },
    short: { en: "UUID", zh: "UUID" },
    hami: { status: "yes", use: pickAvoid("nvidia.com/use-gpuuuid", "nvidia.com/nouse-gpuuuid") },
    dra: { status: "yes", use: pickAvoid("nvidia.com/use-gpuuuid", "nvidia.com/nouse-gpuuuid") },
    volcano: {
      status: "yes",
      use: pickAvoid("volcano.sh/vgpu-use-gpuuuid", "volcano.sh/vgpu-nouse-gpuuuid"),
      note: { en: "Volcano v1.16.0 or later.", zh: "需要 Volcano v1.16.0 及以上。" },
      guide: volcanoDoc("selecting-vgpu-devices-by-uuid", {
        en: "Volcano docs: select GPUs by UUID",
        zh: "Volcano 文档：按 UUID 选卡",
      }),
    },
    kai: {
      status: "no",
    },
  },
  nodePolicy: {
    title: { en: "Node binpack or spread", zh: "节点级 binpack/spread" },
    short: { en: "Node", zh: "节点级" },
    hami: {
      status: "yes",
      use: clusterOrPod("nodeSchedulerPolicy", "hami.io/node-scheduler-policy"),
    },
    dra: {
      status: "no",
      note: {
        en: "Setting it raises no error, but it has no effect.",
        zh: "写了不会报错，但不生效。",
      },
    },
    volcano: {
      status: "partial",
      use: "deviceshare.SchedulePolicy",
      note: {
        en: "Cluster-wide only, and only with deviceshare.ScheduleWeight above 0.",
        zh: "只能全局配置，且要把 deviceshare.ScheduleWeight 设为大于 0。",
      },
      guide: VOLCANO_POLICY,
    },
    kai: {
      status: "yes",
      use: "placementStrategy.gpu",
      note: {
        en: "Set per SchedulingShard, not per Pod.",
        zh: "按调度分片（SchedulingShard）配置，不能按 Pod 指定。",
      },
      guide: KAI_PLACEMENT,
    },
  },
  gpuPolicy: {
    title: { en: "GPU binpack or spread", zh: "卡级 binpack/spread" },
    short: { en: "GPU", zh: "卡级" },
    hami: {
      status: "yes",
      use: clusterOrPod("gpuSchedulerPolicy", "hami.io/gpu-scheduler-policy"),
    },
    dra: {
      status: "no",
      note: {
        en: "Setting it raises no error, but it has no effect.",
        zh: "写了不会报错，但不生效。",
      },
    },
    volcano: {
      status: "partial",
      use: "deviceshare.SchedulePolicy",
      note: {
        en: "Cluster-wide only. Volcano v1.15.0 or later.",
        zh: "只能全局配置，需要 Volcano v1.15.0 及以上。",
      },
      guide: VOLCANO_POLICY,
    },
    kai: {
      status: "yes",
      use: "gpupack, gpuspread",
      note: {
        en: "One plugin is enabled to match the node-level strategy. Switch them yourself to differ, for example spread across nodes but pack within each.",
        zh: "默认随节点级策略启用其中一个插件；也可以单独开关，比如节点间打散、节点内装箱。",
      },
      guide: KAI_PLACEMENT,
    },
  },
  numa: {
    title: { en: "NUMA alignment", zh: "NUMA 对齐" },
    short: { en: "NUMA", zh: "NUMA" },
    hami: {
      status: "yes",
      use: [
        { label: { en: "Same NUMA", zh: "多卡同 NUMA" }, code: "nvidia.com/numa-bind" },
        { label: { en: "Match CPU", zh: "对齐 CPU" }, code: "hami.io/numa-alignment" },
      ],
    },
    dra: {
      status: "no",
      note: {
        en: "Setting it raises no error, but it has no effect.",
        zh: "写了不会报错，但不生效。",
      },
    },
    volcano: { status: "no" },
    kai: {
      status: "partial",
      use: { en: "numa plugin", zh: "numa 插件" },
      note: {
        en: "Applies to whole-GPU Pods only, not to fractional ones.",
        zh: "只对整卡 Pod 生效，分数 Pod 不参与。",
      },
      guide: kaiDoc("numa/README.md", {
        en: "KAI docs: NUMA-aware scheduling",
        zh: "KAI 文档：NUMA 感知调度",
      }),
    },
  },
  quota: {
    title: { en: "Quota", zh: "资源配额" },
    short: { en: "Quota", zh: "配额" },
    hami: {
      status: "yes",
      use: [
        { label: { en: "Memory", zh: "显存" }, code: "limits.nvidia.com/gpumem" },
        { label: { en: "Cores", zh: "算力" }, code: "limits.nvidia.com/gpucores" },
      ],
      note: {
        en: "HAMi counts what is actually allocated, so multiple GPUs and percentages add up correctly. Native ResourceQuota only reads the requests. prefix and counts the requested value. Scoped quotas are not applied.",
        zh: "HAMi 按实际分配量计算，多卡和百分比都能算对；原生 ResourceQuota 只认 requests. 前缀，按申请值计算。带 scope 的配额不生效。",
      },
      guide: {
        href: "/docs/userguide/kueue/how-to-use-kueue",
        label: { en: "Queue quotas with Kueue", zh: "搭配 Kueue 设置队列配额" },
      },
    },
    dra: {
      status: "partial",
      note: {
        en: "Native ResourceQuota can only limit the device count. Jobs can get memory and core quotas from Kueue; bare Pods cannot.",
        zh: "原生 ResourceQuota 只能限制设备个数。以 Job 提交时可以用 Kueue 按显存和算力设配额，直接创建的 Pod 不行。",
      },
      guide: {
        href: "https://kueue.sigs.k8s.io/docs/tasks/run/using_hami/#a-configure-resourcetransformation",
        label: { en: "Kueue docs: resource transformation", zh: "Kueue 文档：资源换算配置" },
      },
    },
    volcano: {
      status: "partial",
      use: {
        en: "ResourceQuota or queue capability on volcano.sh/vgpu-*",
        zh: "对 volcano.sh/vgpu-* 设 ResourceQuota 或队列 capability",
      },
      note: {
        en: "Counts the raw request, so memory is not multiplied by the number of GPUs.",
        zh: "按原始申请值计数，多卡时显存不会乘以卡数。",
      },
    },
    kai: {
      status: "partial",
      use: { en: "KAI queue resources.gpu", zh: "KAI 队列的 resources.gpu" },
      note: {
        en: "Counted in GPU fractions; there is no memory quota.",
        zh: "按 GPU 份额计算，没有显存维度的配额。",
      },
      guide: kaiDoc("queues/README.md", {
        en: "KAI docs: scheduling queues",
        zh: "KAI 文档：调度队列",
      }),
    },
  },
  dynamicMig: {
    title: { en: "Dynamic MIG", zh: "动态 MIG" },
    short: { en: "MIG", zh: "MIG" },
    hami: {
      status: "yes",
      use: [
        { label: { en: "Node", zh: "节点" }, code: "operatingmode: mig" },
        { label: { en: "Pod", zh: "Pod" }, code: "nvidia.com/vgpu-mode: mig" },
      ],
    },
    dra: { status: "no" },
    volcano: {
      status: "yes",
      use: [
        { label: { en: "Node", zh: "节点" }, code: "operatingmode: mig" },
        { label: { en: "Pod", zh: "Pod" }, code: "volcano.sh/vgpu-mode: mig" },
      ],
      note: {
        en: "Requires Volcano v1.12.0 or later.",
        zh: "需要 Volcano v1.12.0 及以上。",
      },
      guide: volcanoDoc("dynamic-mig-usage", {
        en: "Volcano docs: dynamic MIG",
        zh: "Volcano 文档：动态 MIG",
      }),
    },
    kai: {
      status: "no",
    },
  },
  allocationMetrics: {
    title: { en: "Allocation metrics", zh: "分配监控" },
    short: { en: "Metrics", zh: "指标" },
    hami: {
      status: "yes",
      use: endpointMetrics("hami-scheduler:31993", "hami_*"),
    },
    dra: {
      status: "yes",
      use: endpointMetrics("hami-dra-monitor:8080", "GPUDevice*, vGPUDevice*"),
    },
    volcano: {
      status: "yes",
      use: endpointMetrics("volcano-scheduler-service:8080", "volcano_vgpu_device_*"),
      guide: { href: "/docs/userguide/volcano-vgpu/nvidia-gpu/monitor" },
    },
    kai: {
      status: "partial",
      use: endpointMetrics("queue-controller:8080", "kai_queue_*_gpus"),
      note: {
        en: "Per queue only, nothing per GPU or per Pod.",
        zh: "只有按队列的统计，没有按卡或按 Pod 的。",
      },
      guide: kaiDoc("metrics/METRICS.md#queue-controller-metrics", {
        en: "KAI docs: metrics",
        zh: "KAI 文档：指标说明",
      }),
    },
  },
  usageMetrics: {
    title: { en: "Real-time usage metrics", zh: "实时用量监控" },
    short: { en: "Metrics", zh: "指标" },
    hami: {
      status: "yes",
      use: endpointMetrics("<node-ip>:31992", "hami_*"),
    },
    dra: {
      status: "no",
    },
    volcano: {
      status: "yes",
      use: endpointMetrics("<pod-ip>:9394", "HostCoreUtilization, vGPU_device_*"),
      note: {
        en: "No Service; scrape the Pod IP.",
        zh: "没有 Service，需直接访问 Pod IP。",
      },
      guide: {
        href: "https://github.com/Project-HAMi/volcano-vgpu-device-plugin#monitor",
        label: { en: "Device plugin docs: monitor", zh: "设备插件文档：监控" },
      },
    },
    kai: {
      status: "yes",
      use: endpointMetrics("kai-resource-isolator-monitor:9394", "hami_*"),
      note: {
        en: "Off by default; set monitor.enabled.",
        zh: "默认关闭，需要开启 monitor.enabled。",
      },
      guide: kaiDoc("gpu-sharing/hami/README.md#per-container-vram-metrics", {
        en: "KAI docs: VRAM metrics",
        zh: "KAI 文档：显存用量指标",
      }),
    },
  },
};
