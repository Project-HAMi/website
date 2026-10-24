// Vendor guides are not in the main sidebar. Each vendor gets its own sidebar so
// that its pages show a sidebar, with a link back to the supported devices page.
// `anchor` is the vendor's heading id on that page, so the link lands on the vendor
// (appended by src/theme/DocSidebarItem/Link).
const vendorSidebar = (label, anchor, items) => [
  {
    type: "doc",
    id: "userguide/device-supported",
    label: "← All supported devices",
    customProps: { anchor },
  },
  { type: "category", label, collapsible: false, items },
];

const vendorPages = (dir, names) => names.map((name) => `userguide/${dir}/${name}`);

// "nvidia-device" -> "nvidia", "metax-device/metax-gpu" -> "metax-gpu"
const vendorKey = (dir) => dir.replace(/^.*\//, "").replace(/-device$/, "");

const vendorExamples = (dir, names) => ({
  type: "category",
  label: "Examples",
  key: `${vendorKey(dir)}-examples`,
  items: vendorPages(`${dir}/examples`, names),
});

module.exports = {
  docs: [
    {
      type: "category",
      label: "Get started",
      collapsed: false,
      link: {
        type: "generated-index",
        title: "Get started",
        description: "Choose a setup, install HAMi and run a first shared GPU workload.",
      },
      items: [
        "get-started/choose-your-setup",
        "get-started/deploy-with-helm",
        "get-started/verify-hami",
      ],
    },
    {
      type: "category",
      label: "Introduction",
      collapsed: true,
      link: {
        type: "generated-index",
        title: "Introduction",
        description: "What HAMi is and what it does for you.",
      },
      items: [
        "core-concepts/introduction",
        "key-features/device-sharing",
        "key-features/device-resource-isolation",
      ],
    },
    {
      type: "category",
      label: "Install",
      collapsed: true,
      link: {
        type: "generated-index",
        title: "Install",
        description: "Install HAMi, or one of the approaches built on it.",
      },
      items: [
        {
          type: "category",
          label: "HAMi",
          items: [
            "installation/prerequisites",
            "installation/online-installation",
            "installation/offline-installation",
            "installation/upgrade",
            "installation/uninstall",
            "installation/webui-installation",
            "installation/aws-installation",
            "installation/k3s-installation",
            "installation/gke-installation",
            "installation/tke-installation",
            "installation/openshift-installation",
            "installation/cce-installation",
            "installation/ack-installation",
          ],
        },
        {
          type: "category",
          label: "HAMi-DRA",
          items: ["installation/configure-cdi", "installation/how-to-use-hami-dra"],
        },
        {
          type: "category",
          label: "Volcano-HAMi",
          items: [
            "installation/how-to-use-volcano-vgpu",
            "installation/how-to-use-volcano-ascend",
            {
              type: "category",
              label: "NVIDIA GPU",
              items: [
                "userguide/volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu",
                "userguide/volcano-vgpu/nvidia-gpu/monitor",
                {
                  type: "category",
                  label: "Examples",
                  key: "volcano-vgpu-examples",
                  items: [
                    "userguide/volcano-vgpu/nvidia-gpu/examples/default-use",
                    "userguide/volcano-vgpu/nvidia-gpu/examples/use-exclusive-gpu",
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "category",
          label: "KAI-scheduler-HAMi",
          items: ["userguide/kai-scheduler/how-to-use-kai-scheduler"],
        },
      ],
    },
    {
      type: "category",
      label: "Vendor guides",
      collapsed: true,
      link: {
        type: "generated-index",
        title: "Vendor guides",
        description:
          "Start from the supported devices matrix, then follow the guide for your vendor.",
      },
      items: ["userguide/device-supported"],
    },
    {
      type: "category",
      label: "Operate",
      collapsed: true,
      link: {
        type: "generated-index",
        title: "Operate",
        description: "Configure, monitor, queue and troubleshoot a running cluster.",
      },
      items: [
        "userguide/configure",
        "userguide/interactive-manifest-generator",
        {
          type: "category",
          label: "Monitoring",
          items: [
            "userguide/monitoring/device-allocation",
            "userguide/monitoring/real-time-usage",
            "userguide/monitoring/real-time-device-usage",
            "userguide/monitoring/grafana-dashboard",
          ],
        },
        "userguide/benchmark",
        "userguide/hami-webui-user-guide",
        {
          type: "category",
          label: "Using HAMi with Kueue",
          items: [
            "userguide/kueue/how-to-use-kueue",
            {
              type: "category",
              label: "Examples",
              key: "kueue-examples",
              items: ["userguide/kueue/examples/default-use"],
            },
          ],
        },
        "troubleshooting/troubleshooting",
        "troubleshooting/paddle-threadlocal-coredump",
        "faq/faq",
      ],
    },
    {
      type: "category",
      label: "Design and develop",
      collapsed: true,
      link: {
        type: "generated-index",
        title: "Design and develop",
        description: "Architecture, GPU internals, build and scheduler design.",
      },
      items: [
        "core-concepts/gpu-virtualization",
        "core-concepts/architecture",
        "core-concepts/hami-architecture",
        "core-concepts/gpu-stack",
        "core-concepts/gpu-driver",
        "core-concepts/ecosystem-integrations",
        "developers/build",
        "developers/protocol",
        "developers/scheduling",
        "developers/hami-core-design",
        "developers/dynamic-mig",
        "developers/dynamic-mig-lifecycle",
        "developers/dynamic-mig-migration",
        "developers/gpu-topology-scheduling",
        "developers/kunlunxin-topology",
        "developers/profiling-scheduler",
        "developers/scheduler-event-log",
        "developers/scheduler-metrics",
        "developers/gpu-utilization-metrics",
        "developers/hami-vnpu-core-integration",
        "developers/hami-webui-development-guide",
        "developers/amd-vgpu-design",
        "developers/dry-run-filter-design",
        "developers/hostpid-broker",
        "developers/init-container-design",
        "developers/sidecar-container-design",
        "developers/gpu-limit-delivery-design",
        "developers/hami-opencost-cost-attribution",
      ],
    },
    {
      type: "category",
      label: "Contributor Guide",
      link: {
        type: "generated-index",
        title: "Contributor Guide",
        description: "Contribution workflow, governance and maintainer ladder.",
      },
      items: [
        "contributor/contributing",
        "contributor/contribute-docs",
        "contributor/github-workflow",
        "contributor/governance",
        "contributor/ladder",
        "contributor/roadmap",
        "contributor/general-technical-review",
        "contributor/e2e-testing",
      ],
    },
  ],
  // Vendor sidebars, one per device guide.
  amdDevice: vendorSidebar("AMD GPU", "amd", [
    ...vendorPages("amd-device", [
      "enable-amd-gpu-sharing",
      "how-it-works",
      "configuration",
      "troubleshooting",
      "verification-status",
    ]),
    vendorExamples("amd-device", [
      "default-use",
      "use-memory",
      "use-memory-percentage",
      "allocate-core-and-memory",
      "specify-card-type-to-use",
      "specify-card-type-not-use",
      "specify-uuid-to-use",
      "specify-uuid-not-use",
      "numa-bind",
      "link-bind",
      "scheduler-policy",
      "task-priority",
    ]),
  ]),
  ascendDevice: vendorSidebar("Huawei Ascend NPU", "huawei-ascend", [
    ...vendorPages("ascend-device", ["enable-ascend-sharing", "device-template"]),
    vendorExamples("ascend-device", [
      "allocate-310p",
      "allocate-910b",
      "allocate-exclusive",
      "allocate-soft-slicing",
    ]),
  ]),
  awsNeuronDevice: vendorSidebar("AWS Neuron", "aws-neuron", [
    ...vendorPages("awsneuron-device", ["enable-awsneuron-managing"]),
    vendorExamples("awsneuron-device", ["allocate-neuron-core", "allocate-neuron-device"]),
  ]),
  birenDevice: vendorSidebar("Biren GPU", "biren", [
    ...vendorPages("biren-device", ["enable-biren-sharing"]),
    vendorExamples("biren-device", ["default-use"]),
  ]),
  cambriconDevice: vendorSidebar("Cambricon MLU", "cambricon", [
    ...vendorPages("cambricon-device", [
      "enable-cambricon-mlu-sharing",
      "specify-device-memory-usage",
      "specify-device-core-usage",
      "specify-device-type-to-use",
    ]),
    vendorExamples("cambricon-device", ["allocate-core-and-memory", "allocate-exclusive"]),
  ]),
  enflameDevice: vendorSidebar(
    "Enflame GCU",
    "enflame",
    vendorPages("enflame-device", ["enable-enflame-gcu-sharing"]),
  ),
  hygonDevice: vendorSidebar("Hygon HCU", "hygon", [
    ...vendorPages("hygon-device", [
      "enable-hygon-hcu-sharing",
      "specify-device-memory-usage",
      "specify-device-core-usage",
      "specify-device-uuid-to-use",
    ]),
    vendorExamples("hygon-device", [
      "allocate-core-and-memory",
      "allocate-exclusive",
      "specify-certain-cards",
    ]),
  ]),
  iluvatarDevice: vendorSidebar("Iluvatar GPU", "iluvatar", [
    ...vendorPages("iluvatar-device", ["enable-iluvatar-gpu-sharing"]),
    vendorExamples("iluvatar-device", [
      "allocate-bi-v150",
      "allocate-mr-v100",
      "allocate-exclusive-bi-v150",
      "allocate-exclusive-mr-v100",
    ]),
  ]),
  kunlunxinDevice: vendorSidebar("Kunlunxin XPU", "kunlunxin", [
    ...vendorPages("kunlunxin-device", ["enable-kunlunxin-schedule", "enable-kunlunxin-vxpu"]),
    vendorExamples("kunlunxin-device", ["allocate-whole-xpu", "allocate-vxpu"]),
  ]),
  metaxDevice: vendorSidebar("MetaX GPU", "metax", [
    {
      type: "category",
      label: "GPU (topology-aware)",
      key: "metax-gpu",
      items: [
        ...vendorPages("metax-device/metax-gpu", [
          "enable-metax-gpu-schedule",
          "specify-binpack-task",
          "specify-spread-task",
        ]),
        vendorExamples("metax-device/metax-gpu", [
          "default-use",
          "allocate-binpack",
          "allocate-spread",
        ]),
      ],
    },
    {
      type: "category",
      label: "sGPU (shared)",
      key: "metax-sgpu",
      items: [
        ...vendorPages("metax-device/metax-sgpu", ["enable-metax-gpu-sharing"]),
        vendorExamples("metax-device/metax-sgpu", [
          "default-use",
          "allocate-exclusive",
          "allocate-qos-policy",
        ]),
      ],
    },
  ]),
  mthreadsDevice: vendorSidebar("Mthreads GPU", "mthreads", [
    ...vendorPages("mthreads-device", [
      "enable-mthreads-gpu-sharing",
      "specify-device-memory-usage",
      "specify-device-core-usage",
    ]),
    vendorExamples("mthreads-device", ["allocate-core-and-memory", "allocate-exclusive"]),
  ]),
  nvidiaDevice: vendorSidebar("NVIDIA GPU", "nvidia", [
    ...vendorPages("nvidia-device", [
      "specify-device-memory-usage",
      "specify-device-core-usage",
      "specify-device-type-to-use",
      "specify-device-uuid-to-use",
      "scheduling-policy",
      "numa-alignment",
      "dynamic-mig-support",
      "dynamic-resource-allocation",
      "using-resourcequota",
    ]),
    vendorExamples("nvidia-device", [
      "use-exclusive-card",
      "allocate-device-memory",
      "allocate-device-memory2",
      "allocate-device-core",
      "specify-card-type-to-use",
      "specify-certain-card",
      "dynamic-mig-example",
    ]),
  ]),
  vastaiDevice: vendorSidebar("Vastai GPU", "vastai", [
    ...vendorPages("vastai", ["enable-vastai-sharing"]),
    vendorExamples("vastai", ["default-use"]),
  ]),
};
