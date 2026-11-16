// Which features each HAMi setup supports on devices other than NVIDIA GPUs, checked against
// source code in November 2026. HAMi follows v2.11.0 (master has no change that affects these
// entries). HAMi-DRA follows v0.2.4 with amd-dra-driver v0.4.1, k8s-hcu-dra-driver v1.0.1 and
// Project-HAMi/ascend-dra-driver main (744ba90, no release yet). Volcano follows v1.16.0. KAI
// Scheduler follows v0.19.0.
// The fields follow src/data/featureSupport.js, which merges these entries into FEATURES.
// The matrix on the Choose your setup page covers NVIDIA GPUs only, so these entries have no page.

const pickAvoid = (pick, avoid) => [
  { label: { en: "Pick", zh: "指定" }, code: pick },
  { label: { en: "Avoid", zh: "排除" }, code: avoid },
];

const draDoc = (file, label) => ({
  href: `https://github.com/Project-HAMi/HAMi-DRA/blob/main/docs/${file}`,
  label,
});

const AMD_DRA = draDoc("amd-dra.md", {
  en: "HAMi-DRA docs: AMD GPUs",
  zh: "HAMi-DRA 文档：AMD GPU",
});
const HYGON_DRA = draDoc("hygon-hcu.md", {
  en: "HAMi-DRA docs: Hygon HCU",
  zh: "HAMi-DRA 文档：海光 HCU",
});
const ASCEND_DRA = draDoc("ascend-dra.md", {
  en: "HAMi-DRA docs: Ascend",
  zh: "HAMi-DRA 文档：昇腾",
});
const VOLCANO_ASCEND = { href: "/docs/installation/how-to-use-volcano-ascend" };
// Volcano supports Ascend through its vNPU integration, not volcano-vgpu-device-plugin.
const ASCEND_COMPONENTS = {
  volcano: { name: "Volcano vNPU", full: { en: "Volcano Ascend vNPU", zh: "Volcano 昇腾 vNPU" } },
};

const ASCEND_DRIVER_NOTE = {
  en: "Needs ascend-dra-driver, which has no release yet.",
  zh: "需要 ascend-dra-driver，该驱动尚未发版。",
};

// Cells for setups that do not handle the device at all.
const DRA_NO = {
  status: "no",
  note: {
    en: "HAMi-DRA v0.2.4 converts requests for NVIDIA, AMD, Hygon and Ascend devices only.",
    zh: "HAMi-DRA v0.2.4 只转换 NVIDIA、AMD、海光和昇腾设备的资源请求。",
  },
};
const VOLCANO_NO = {
  status: "no",
  note: {
    en: "Volcano's HAMi integration covers NVIDIA GPUs and Ascend NPUs only.",
    zh: "Volcano 的 HAMi 集成只支持 NVIDIA GPU 和昇腾 NPU。",
  },
};
const KAI_NO = {
  status: "no",
  note: {
    en: "KAI Scheduler works with HAMi-core, which supports NVIDIA GPUs only.",
    zh: "KAI Scheduler 搭配的 HAMi-core 只支持 NVIDIA GPU。",
  },
};
// HAMi-DRA handles the device but reads only the count, memory, core, UUID and type fields.
const DRA_NO_FIELD = {
  status: "no",
  note: {
    en: "HAMi-DRA v0.2.4 does not read this field.",
    zh: "HAMi-DRA v0.2.4 不读取这个字段。",
  },
};

// A feature only HAMi supports.
const hamiOnly = (title, short, use) => ({
  title,
  short,
  hami: { status: "yes", use },
  dra: DRA_NO,
  volcano: VOLCANO_NO,
  kai: KAI_NO,
});

const WHOLE = { en: "Whole device", zh: "整卡" };
const MEM = { en: "Memory", zh: "显存" };
const CORES = { en: "Compute", zh: "算力" };
const SELECT_UUID = { en: "By UUID", zh: "按 UUID" };

export const VENDOR_FEATURES = {
  // AMD GPU
  amdWhole: {
    title: { en: "Whole AMD GPU", zh: "整卡分配 AMD GPU" },
    short: WHOLE,
    hami: { status: "yes", use: "amd.com/gpu" },
    dra: { status: "yes", use: "amd.com/gpu", guide: AMD_DRA },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdMem: {
    title: { en: "AMD GPU memory in MiB", zh: "按 MiB 分配 AMD GPU 显存" },
    short: { en: "In MiB", zh: "按 MiB" },
    hami: { status: "yes", use: "amd.com/gpumem" },
    dra: { status: "yes", use: "amd.com/gpumem", guide: AMD_DRA },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdMemPercent: {
    title: { en: "AMD GPU memory by percentage", zh: "按百分比分配 AMD GPU 显存" },
    short: { en: "By percent", zh: "按百分比" },
    hami: { status: "yes", use: "amd.com/gpumem-percentage" },
    dra: { status: "yes", use: "amd.com/gpumem-percentage", guide: AMD_DRA },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdCores: {
    title: { en: "AMD GPU compute units", zh: "分配 AMD GPU 计算单元" },
    short: CORES,
    hami: { status: "yes", use: "amd.com/gpucores" },
    dra: {
      status: "yes",
      use: "amd.com/gpucores",
      note: {
        en: "Set amdReferenceComputeUnits when GPUs with different numbers of compute units share the cluster.",
        zh: "集群中 GPU 的计算单元数不同时，需要设置 amdReferenceComputeUnits。",
      },
      guide: AMD_DRA,
    },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdType: {
    title: { en: "AMD GPU type", zh: "按型号选择 AMD GPU" },
    short: { en: "By type", zh: "按型号" },
    hami: { status: "yes", use: pickAvoid("amd.com/use-gputype", "amd.com/nouse-gputype") },
    dra: {
      status: "yes",
      use: pickAvoid("amd.com/use-gputype", "amd.com/nouse-gputype"),
      guide: AMD_DRA,
    },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdUuid: {
    title: { en: "AMD GPU by UUID", zh: "按 UUID 选择 AMD GPU" },
    short: SELECT_UUID,
    hami: { status: "yes", use: pickAvoid("amd.com/use-gpu-uuid", "amd.com/nouse-gpu-uuid") },
    dra: {
      status: "yes",
      use: pickAvoid("amd.com/use-gpu-uuid", "amd.com/nouse-gpu-uuid"),
      guide: AMD_DRA,
    },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdNuma: {
    title: { en: "AMD GPUs on one NUMA node", zh: "AMD GPU 位于同一 NUMA 节点" },
    short: { en: "NUMA", zh: "NUMA" },
    hami: { status: "yes", use: "amd.com/numa-bind" },
    dra: DRA_NO_FIELD,
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdLink: {
    title: { en: "XGMI-linked AMD GPUs", zh: "XGMI 互联的 AMD GPU" },
    short: { en: "XGMI links", zh: "XGMI 互联" },
    hami: { status: "yes", use: "amd.com/link-bind" },
    dra: DRA_NO_FIELD,
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdGpuPolicy: {
    title: { en: "AMD GPU scheduling policy", zh: "AMD GPU 卡级调度策略" },
    short: { en: "GPU policy", zh: "卡级策略" },
    hami: { status: "yes", use: "hami.io/gpu-scheduler-policy" },
    dra: DRA_NO_FIELD,
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  amdPriority: {
    title: { en: "AMD GPU queue priority", zh: "AMD GPU 队列优先级" },
    short: { en: "Priority", zh: "优先级" },
    hami: {
      status: "yes",
      use: "AMD_TASK_PRIORITY",
      note: { en: "Applies to slices only.", zh: "只对切分的 GPU 生效。" },
    },
    dra: {
      status: "yes",
      use: "AMD_TASK_PRIORITY",
      note: { en: "Applies to slices only.", zh: "只对切分的 GPU 生效。" },
      guide: AMD_DRA,
    },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },

  // Huawei Ascend NPU
  ascendWhole: {
    title: { en: "Whole Ascend NPU", zh: "整卡分配昇腾 NPU" },
    components: ASCEND_COMPONENTS,
    short: WHOLE,
    hami: { status: "yes", use: "huawei.com/<chip>" },
    dra: { status: "yes", use: "huawei.com/<chip>", note: ASCEND_DRIVER_NOTE, guide: ASCEND_DRA },
    volcano: { status: "yes", use: "huawei.com/<chip>", guide: VOLCANO_ASCEND },
    kai: KAI_NO,
  },
  ascendTemplate: {
    title: { en: "Ascend template slices", zh: "昇腾模板切分" },
    components: ASCEND_COMPONENTS,
    short: { en: "Template slice", zh: "模板切分" },
    hami: { status: "yes", use: "huawei.com/<chip>-memory" },
    dra: {
      status: "partial",
      use: "huawei.com/<chip>-memory",
      note: {
        en: "HAMi-DRA turns the request into a soft slice (HAMivNPUCore), so memory is not rounded up to a vNPU template. Needs ascend-dra-driver, which has no release yet.",
        zh: "HAMi-DRA 会把请求转换为软切分（HAMivNPUCore），显存不会向上取整到 vNPU 模板。需要 ascend-dra-driver，该驱动尚未发版。",
      },
      guide: ASCEND_DRA,
    },
    volcano: { status: "yes", use: "huawei.com/<chip>-memory", guide: VOLCANO_ASCEND },
    kai: KAI_NO,
  },
  ascendSoft: {
    title: { en: "Ascend soft slicing", zh: "昇腾软切分" },
    components: ASCEND_COMPONENTS,
    short: { en: "Soft slice", zh: "软切分" },
    hami: {
      status: "yes",
      use: "huawei.com/vnpu-mode, huawei.com/<chip>-memory, huawei.com/<chip>-core",
    },
    dra: {
      status: "yes",
      use: "huawei.com/<chip>-memory, huawei.com/<chip>-core",
      note: {
        en: "No huawei.com/vnpu-mode annotation is needed. Needs ascend-dra-driver, which has no release yet.",
        zh: "不需要 huawei.com/vnpu-mode 注解。需要 ascend-dra-driver，该驱动尚未发版。",
      },
      guide: ASCEND_DRA,
    },
    volcano: {
      status: "yes",
      use: "huawei.com/vnpu-mode, huawei.com/<chip>-memory, huawei.com/<chip>-core",
      guide: VOLCANO_ASCEND,
    },
    kai: KAI_NO,
  },
  ascendUuid: {
    title: { en: "Ascend NPU by UUID", zh: "按 UUID 选择昇腾 NPU" },
    components: ASCEND_COMPONENTS,
    short: SELECT_UUID,
    hami: {
      status: "yes",
      use: pickAvoid("hami.io/use-<chip>-uuid", "hami.io/no-use-<chip>-uuid"),
    },
    dra: {
      status: "yes",
      use: pickAvoid("hami.io/use-<chip>-uuid", "hami.io/no-use-<chip>-uuid"),
      note: ASCEND_DRIVER_NOTE,
      guide: ASCEND_DRA,
    },
    volcano: {
      status: "no",
      note: {
        en: "Volcano v1.16.0 reads these annotations but does not check them when it picks a device.",
        zh: "Volcano v1.16.0 会读取这些注解，但选卡时不检查它们。",
      },
    },
    kai: KAI_NO,
  },

  // AWS Neuron
  neuronDevice: hamiOnly(
    { en: "Whole Neuron device", zh: "整卡分配 Neuron 设备" },
    WHOLE,
    "aws.amazon.com/neuron",
  ),
  neuronCore: hamiOnly(
    { en: "NeuronCores", zh: "分配 NeuronCore" },
    { en: "NeuronCore", zh: "NeuronCore" },
    "aws.amazon.com/neuroncore",
  ),

  // Biren GPU
  birenWhole: hamiOnly({ en: "Biren GPU", zh: "分配壁仞 GPU" }, WHOLE, "birentech.com/gpu"),

  // Cambricon MLU
  cambWhole: hamiOnly({ en: "Whole MLU", zh: "整卡分配 MLU" }, WHOLE, "cambricon.com/vmlu"),
  cambMem: hamiOnly(
    { en: "MLU memory", zh: "分配 MLU 显存" },
    MEM,
    "cambricon.com/mlu.smlu.vmemory",
  ),
  cambCores: hamiOnly(
    { en: "MLU compute", zh: "分配 MLU 算力" },
    CORES,
    "cambricon.com/mlu.smlu.vcore",
  ),
  cambType: hamiOnly(
    { en: "MLU type", zh: "按型号选择 MLU" },
    { en: "By type", zh: "按型号" },
    pickAvoid("cambricon.com/use-mlutype", "cambricon.com/nouse-mlutype"),
  ),

  // Enflame GCU
  enflameShare: hamiOnly(
    { en: "Enflame GCU slices", zh: "燧原 GCU 切分" },
    { en: "Slice", zh: "切分" },
    "enflame.com/drs-gcu, enflame.com/gcu-memory, enflame.com/gcu-core",
  ),

  // Hygon HCU
  hygonWhole: {
    title: { en: "Whole HCU", zh: "整卡分配 HCU" },
    short: WHOLE,
    hami: { status: "yes", use: "hygon.com/hcunum" },
    dra: { status: "yes", use: "hygon.com/hcunum", guide: HYGON_DRA },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  hygonMem: {
    title: { en: "HCU memory", zh: "分配 HCU 显存" },
    short: MEM,
    hami: { status: "yes", use: "hygon.com/hcumem" },
    dra: { status: "yes", use: "hygon.com/hcumem", guide: HYGON_DRA },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  hygonCores: {
    title: { en: "HCU compute", zh: "分配 HCU 算力" },
    short: CORES,
    hami: { status: "yes", use: "hygon.com/hcucores" },
    dra: {
      status: "yes",
      use: "hygon.com/hcucores",
      note: {
        en: "Set hcuReferenceComputeUnits to the compute units of one card first.",
        zh: "需要先把 hcuReferenceComputeUnits 设为单卡的计算单元数。",
      },
      guide: HYGON_DRA,
    },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },
  hygonUuid: {
    title: { en: "HCU by UUID", zh: "按 UUID 选择 HCU" },
    short: SELECT_UUID,
    hami: { status: "yes", use: pickAvoid("hygon.com/use-gpuuuid", "hygon.com/nouse-gpuuuid") },
    dra: {
      status: "yes",
      use: pickAvoid("hygon.com/use-gpuuuid", "hygon.com/nouse-gpuuuid"),
      guide: HYGON_DRA,
    },
    volcano: VOLCANO_NO,
    kai: KAI_NO,
  },

  // Iluvatar GPU
  iluvatarWhole: hamiOnly(
    { en: "Whole Iluvatar GPU", zh: "整卡分配天数智芯 GPU" },
    WHOLE,
    "iluvatar.ai/<model>-vgpu",
  ),
  iluvatarShare: hamiOnly(
    { en: "Iluvatar GPU slices", zh: "天数智芯 GPU 切分" },
    { en: "Slice", zh: "切分" },
    "iluvatar.ai/<model>-vgpu, iluvatar.ai/<model>.vMem, iluvatar.ai/<model>.vCore",
  ),

  // Kunlunxin XPU
  kunlunWhole: hamiOnly({ en: "Whole XPU", zh: "整卡分配 XPU" }, WHOLE, "kunlunxin.com/xpu"),
  kunlunVxpu: hamiOnly(
    { en: "VXPU", zh: "分配 VXPU" },
    { en: "VXPU", zh: "VXPU" },
    "kunlunxin.com/vxpu, kunlunxin.com/vxpu-memory",
  ),

  // MetaX GPU
  metaxWhole: hamiOnly(
    { en: "Whole MetaX GPU", zh: "整卡分配沐曦 GPU" },
    WHOLE,
    "metax-tech.com/gpu",
  ),
  metaxTopology: hamiOnly(
    { en: "MetaX topology policy", zh: "沐曦拓扑调度策略" },
    { en: "Node policy", zh: "节点策略" },
    "hami.io/node-scheduler-policy",
  ),
  metaxSgpuWhole: hamiOnly(
    { en: "Whole MetaX sGPU", zh: "整卡分配沐曦 sGPU" },
    WHOLE,
    "metax-tech.com/sgpu",
  ),
  metaxSgpu: hamiOnly(
    { en: "MetaX sGPU slices", zh: "沐曦 sGPU 切分" },
    { en: "Slice", zh: "切分" },
    "metax-tech.com/sgpu, metax-tech.com/vmemory, metax-tech.com/vcore",
  ),
  metaxQos: hamiOnly(
    { en: "MetaX sGPU QoS policy", zh: "沐曦 sGPU QoS 策略" },
    { en: "QoS", zh: "QoS" },
    "metax-tech.com/sgpu-qos-policy",
  ),

  // Moore Threads GPU
  mthWhole: hamiOnly(
    { en: "Whole Moore Threads GPU", zh: "整卡分配摩尔线程 GPU" },
    WHOLE,
    "mthreads.com/vgpu",
  ),
  mthMem: hamiOnly(
    { en: "Moore Threads GPU memory", zh: "分配摩尔线程 GPU 显存" },
    MEM,
    "mthreads.com/sgpu-memory",
  ),
  mthCores: hamiOnly(
    { en: "Moore Threads GPU compute", zh: "分配摩尔线程 GPU 算力" },
    CORES,
    "mthreads.com/sgpu-core",
  ),

  // Vastai
  vastaiWhole: hamiOnly({ en: "Vastai device", zh: "分配瀚博设备" }, WHOLE, "vastaitech.com/va"),
};
