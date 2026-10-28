// Which NVIDIA GPU features each HAMi setup supports, checked against source code in October 2026.
// HAMi follows master 07c89a3f, as these are /docs/next pages, with v2.10.0 differences noted.
// The others follow their latest releases: HAMi-DRA v0.2.3 with k8s-dra-driver v0.1.1, Volcano
// v1.16.0 with volcano-vgpu-device-plugin 5283c86, KAI Scheduler v0.18.6 with KAI-resource-isolator
// v1.1.0. Changes only on their main branches are noted as unreleased.
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
        en: "v0.2.3 leaves the request on the Pod, which stays Pending with Insufficient nvidia.com/gpumem-percentage. Supported on HAMi-DRA main, not released yet.",
        zh: "v0.2.3 不转换这个资源，Pod 会因 Insufficient nvidia.com/gpumem-percentage 一直 Pending。HAMi-DRA main 已支持，尚未发版。",
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
        en: "By default the limit applies only while another container of the same or higher priority runs kernels on the GPU. Set gpuCorePolicy to force to always apply it.",
        zh: "默认只在同卡有同等或更高优先级的容器也在跑 kernel 时才限流；要一直限流，把 gpuCorePolicy 设为 force。",
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
    volcano: {
      status: "yes",
      use: "volcano.sh/vgpu-cores",
      note: {
        en: "The limit applies only while another container of the same or higher priority runs kernels on the GPU.",
        zh: "只在同卡有同等或更高优先级的容器也在跑 kernel 时才限流。",
      },
      guide: VOLCANO_JOBS,
    },
    kai: {
      status: "no",
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
        en: "Exact, case-sensitive match on the full name nvidia-smi shows. A100 alone matches nothing.",
        zh: "按 nvidia-smi 显示的完整型号名精确匹配并区分大小写，只写 A100 匹配不到。",
      },
    },
    volcano: {
      status: "yes",
      use: pickAvoid("nvidia.com/use-gputype", "nvidia.com/nouse-gputype"),
    },
    kai: {
      status: "partial",
      use: {
        en: "nodeSelector or nodeAffinity on nvidia.com/gpu.product",
        zh: "用 nodeSelector 或 nodeAffinity 选 nvidia.com/gpu.product",
      },
      note: {
        en: "Selects nodes, not GPUs within a node.",
        zh: "只能选节点，不能在节点内挑卡。",
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
      note: { en: "Requires Volcano v1.16.0 or later.", zh: "需要 Volcano v1.16.0 及以上。" },
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
      status: "partial",
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
        en: "Cluster-wide, Volcano v1.15.0 or later. Per Pod, the only option is volcano.sh/vgpu-podgroup-policy: spread, which keeps a PodGroup's Pods on separate GPUs.",
        zh: "全局配置，需要 Volcano v1.15.0 及以上。按 Pod 只能用 volcano.sh/vgpu-podgroup-policy: spread，让同一 PodGroup 的 Pod 不共用一张卡。",
      },
      guide: VOLCANO_POLICY,
    },
    kai: {
      status: "partial",
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
      note: {
        en: "hami.io/numa-alignment needs a release after v2.10.0 and is off by default.",
        zh: "hami.io/numa-alignment 需要 v2.10.0 之后的版本，默认关闭。",
      },
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
        en: "Aligns whole GPUs only; a fractional Pod's GPU share is not aligned.",
        zh: "只对齐整卡；分数 Pod 分到的那部分 GPU 不做 NUMA 对齐。",
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
        en: "HAMi counts what is actually allocated, so multiple GPUs and percentages add up correctly. HAMi quotas do not cover the GPU count; use requests.nvidia.com/gpu in a native ResourceQuota. Scoped quotas are skipped, while v2.10.0 applies them to every Pod.",
        zh: "HAMi 按实际分配量计算，多卡和百分比都能算对。HAMi 配额不管卡数，卡数要用原生 ResourceQuota 的 requests.nvidia.com/gpu。带 scope 的配额会被跳过，v2.10.0 则会套用到所有 Pod。",
      },
      guide: {
        href: "/docs/userguide/kueue/how-to-use-kueue",
        label: { en: "Or set queue quotas with Kueue", zh: "也可以用 Kueue 设置队列配额" },
      },
    },
    dra: {
      status: "partial",
      note: {
        en: "The HAMi-DRA webhook removes gpumem and gpucores from Pods, so ResourceQuota on them stops applying, and native quota only counts devices. With Kueue, submit Jobs: queued bare Pods and Deployments cannot be admitted.",
        zh: "HAMi-DRA 的 webhook 会从 Pod 上去掉 gpumem 和 gpucores，针对它们的 ResourceQuota 随之失效，原生配额只能按设备个数计。用 Kueue 时要以 Job 提交，排队的裸 Pod 和 Deployment 无法准入。",
      },
      guide: {
        href: "https://kueue.sigs.k8s.io/docs/tasks/run/using_hami/#a-configure-resourcetransformation",
        label: { en: "Kueue docs: resource transformation", zh: "Kueue 文档：资源换算配置" },
      },
    },
    volcano: {
      status: "partial",
      use: [
        { label: { en: "Native", zh: "原生" }, code: "requests.volcano.sh/vgpu-*" },
        { label: { en: "Queue", zh: "队列" }, code: "capability" },
      ],
      note: {
        en: "Both count the request as written: memory is per GPU and is not multiplied by vgpu-number. The queue's status.allocated shows the multiplied total and can exceed capability. Queue limits on vgpu-memory need v1.13.0 or later.",
        zh: "两者都按申请值计数：显存是每卡的值，多卡时不乘卡数。队列 status.allocated 显示的是乘卡数后的总量，可能超过 capability。队列限制 vgpu-memory 需要 v1.13.0 及以上。",
      },
    },
    kai: {
      status: "partial",
      use: { en: "KAI queue resources.gpu", zh: "KAI 队列的 resources.gpu" },
      note: {
        en: "Counted in GPU fractions; there is no GPU memory quota.",
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
      use: endpointMetrics("<device-plugin-pod-ip>:9394", "hami_*"),
      note: {
        en: "Each GPU node's device plugin Pod serves only its own node's metrics. NodePort 31992 lands on a random one, so scrape Pod IPs or use the ServiceMonitor.",
        zh: "每个 GPU 节点的设备插件 Pod 只提供本节点的数据。NodePort 31992 会随机落到某个节点，要按 Pod IP 抓取或用 ServiceMonitor。",
      },
    },
    dra: {
      status: "no",
    },
    volcano: {
      status: "yes",
      use: endpointMetrics("<device-plugin-pod-ip>:9394", "Host*, vGPU_device_*, Device_*"),
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
      use: endpointMetrics("<monitor-pod-ip>:9394", "hami_*"),
      note: {
        en: "Off by default: needs kai-resource-isolator 1.1.0-chart or later with monitor.enabled. Whole-GPU Pods get no per-container metrics.",
        zh: "默认关闭，需要 kai-resource-isolator 1.1.0-chart 及以上并开启 monitor.enabled。整卡 Pod 没有容器级指标。",
      },
      guide: kaiDoc("gpu-sharing/hami/README.md#per-container-vram-metrics", {
        en: "KAI docs: VRAM metrics",
        zh: "KAI 文档：显存用量指标",
      }),
    },
  },
};
