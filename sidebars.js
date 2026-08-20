module.exports = {
  docs: [
    {
      type: "category",
      label: "Core Concepts",
      collapsed: false,
      link: {
        type: "generated-index",
        title: "Core Concepts",
        description: "Learn what HAMi is and how the core architecture works.",
      },
      items: [
        "core-concepts/introduction",
        "core-concepts/gpu-virtualization",
        "core-concepts/architecture",
        "core-concepts/gpu-stack",
        "core-concepts/gpu-driver",
        "core-concepts/hami-architecture",
        "core-concepts/ecosystem-integrations",
      ],
    },
    {
      type: "category",
      label: "Key Features",
      link: {
        type: "generated-index",
        title: "Key Features",
        description: "Explore the most important capabilities in HAMi.",
      },
      items: ["key-features/device-sharing", "key-features/device-resource-isolation"],
    },
    {
      type: "category",
      label: "Get Started",
      link: {
        type: "generated-index",
        title: "Get Started",
        description: "Install and run HAMi quickly with a guided first deployment path.",
      },
      items: ["get-started/deploy-with-helm", "get-started/verify-hami"],
    },
    {
      type: "category",
      label: "Installation",
      link: {
        type: "generated-index",
        title: "Installation",
        description: "Installation methods, prerequisites, upgrades and integrations.",
      },
      items: [
        "installation/prerequisites",
        "installation/configure-cdi",
        "installation/online-installation",
        "installation/offline-installation",
        "installation/upgrade",
        "installation/uninstall",
        "installation/webui-installation",
        "installation/aws-installation",
        "installation/how-to-use-hami-dra",
        "installation/how-to-use-volcano-vgpu",
        "installation/how-to-use-volcano-ascend",
      ],
    },
    {
      type: "category",
      label: "User Guide",
      link: {
        type: "generated-index",
        title: "User Guide",
        description:
          "Configure devices, request resources, monitor workloads and troubleshoot usage.",
      },
      items: [
        "userguide/configure",
        "userguide/device-supported",
        "userguide/benchmark",
        "userguide/hami-webui-user-guide",
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
        {
          type: "category",
          label: "Share NVIDIA GPU devices",
          items: [
            "userguide/nvidia-device/dynamic-resource-allocation",
            "userguide/nvidia-device/dynamic-mig-support",
            "userguide/nvidia-device/scheduling-policy",
            "userguide/nvidia-device/allocate-device-memory-usage",
            "userguide/nvidia-device/allocate-device-core-usage",
            "userguide/nvidia-device/assign-to-certain-device-type",
            "userguide/nvidia-device/assign-to-certain-device-uuid",
            "userguide/nvidia-device/using-resourcequota",
            {
              type: "category",
              label: "Examples",
              key: "nvidia-examples",
              items: [
                "userguide/nvidia-device/examples/use-exclusive-card",
                "userguide/nvidia-device/examples/allocate-device-memory",
                "userguide/nvidia-device/examples/allocate-device-memory-by-percentage",
                "userguide/nvidia-device/examples/allocate-device-core",
                "userguide/nvidia-device/examples/assign-task-to-a-certain-type",
                "userguide/nvidia-device/examples/assign-task-to-a-certain-gpu",
                "userguide/nvidia-device/examples/assign-task-to-mig-instance",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Share Cambricon MLU devices",
          items: [
            "userguide/cambricon-device/enable-cambricon-mlu-sharing",
            "userguide/cambricon-device/allocate-device-memory-usage",
            "userguide/cambricon-device/allocate-device-core-usage",
            "userguide/cambricon-device/assign-to-certain-device-type",
            {
              type: "category",
              label: "Examples",
              key: "cambricon-examples",
              items: [
                "userguide/cambricon-device/examples/allocate-core-and-memory",
                "userguide/cambricon-device/examples/allocate-exclusive",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Share Hygon DCU devices",
          items: [
            "userguide/hygon-device/enable-hygon-dcu-sharing",
            "userguide/hygon-device/allocate-device-memory-usage",
            "userguide/hygon-device/allocate-device-core-usage",
            "userguide/hygon-device/assign-to-a-certain-device",
            {
              type: "category",
              label: "Examples",
              key: "hygon-examples",
              items: [
                "userguide/hygon-device/examples/allocate-core-and-memory-resource",
                "userguide/hygon-device/examples/allocate-exclusive-device",
                "userguide/hygon-device/examples/assign-task-to-certain-dcu-cards",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Share Mthreads GPU devices",
          items: [
            "userguide/mthreads-device/enable-mthreads-gpu-sharing",
            "userguide/mthreads-device/allocate-device-memory",
            "userguide/mthreads-device/allocate-device-core-usage",
            {
              type: "category",
              label: "Examples",
              key: "mthreads-examples",
              items: [
                "userguide/mthreads-device/examples/allocate-core-and-memory-resource",
                "userguide/mthreads-device/examples/allocate-exclusive-device",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Share Iluvatar GPU devices",
          items: [
            "userguide/iluvatar-device/enable-iluvatar-gpu-sharing",
            {
              type: "category",
              label: "Examples",
              key: "iluvatar-examples",
              items: [
                "userguide/iluvatar-device/examples/allocate-bi-v150",
                "userguide/iluvatar-device/examples/allocate-mr-v100",
                "userguide/iluvatar-device/examples/allocate-exclusive-bi-v150",
                "userguide/iluvatar-device/examples/allocate-exclusive-mr-v100",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Share Enflame GCU devices",
          items: ["userguide/enflame-device/enable-enflame-gcu-sharing"],
        },
        {
          type: "category",
          label: "Share AMD GPU devices",
          items: [
            "userguide/amd-device/enable-amd-gpu-sharing",
            {
              type: "category",
              label: "Examples",
              key: "amd-examples",
              items: ["userguide/amd-device/examples/allocate-core-and-memory"],
            },
          ],
        },
        {
          type: "category",
          label: "Managing AWS Neuron devices",
          items: [
            "userguide/awsneuron-device/enable-awsneuron-managing",
            {
              type: "category",
              label: "Examples",
              key: "awsneuron-examples",
              items: [
                "userguide/awsneuron-device/examples/allocate-neuron-core",
                "userguide/awsneuron-device/examples/allocate-neuron-device",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Managing Vastai devices",
          items: [
            "userguide/vastai/enable-vastai-sharing",
            {
              type: "category",
              label: "Examples",
              key: "vastai-examples",
              items: ["userguide/vastai/examples/allocate-vastai-device"],
            },
          ],
        },
        {
          type: "category",
          label: "Managing Biren devices",
          items: [
            "userguide/biren-device/enable-biren-sharing",
            {
              type: "category",
              label: "Examples",
              key: "biren-examples",
              items: ["userguide/biren-device/examples/default-use"],
            },
          ],
        },
        {
          type: "category",
          label: "Optimize Kunlunxin devices scheduling",
          items: [
            "userguide/kunlunxin-device/enable-kunlunxin-schedule",
            "userguide/kunlunxin-device/enable-kunlunxin-vxpu",
            {
              type: "category",
              label: "Examples",
              key: "kunlunxin-examples",
              items: [
                "userguide/kunlunxin-device/examples/allocate-a-whole-xpu",
                "userguide/kunlunxin-device/examples/allocate-vxpu",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Optimize MetaX GPU scheduling",
          items: [
            {
              type: "category",
              label: "Share MetaX GPU devices",
              items: [
                "userguide/metax-device/metax-sgpu/enable-metax-gpu-sharing",
                {
                  type: "category",
                  label: "Examples",
                  key: "metax-sgpu-examples",
                  items: [
                    "userguide/metax-device/metax-sgpu/examples/allocate-device-core-and-memory-resource",
                    "userguide/metax-device/metax-sgpu/examples/allocate-exclusive",
                    "userguide/metax-device/metax-sgpu/examples/allocate-specific-qos-policy",
                  ],
                },
              ],
            },
            {
              type: "category",
              label: "MetaX GPU topology-aware scheduling",
              items: [
                "userguide/metax-device/metax-gpu/enable-metax-gpu-schedule",
                "userguide/metax-device/metax-gpu/binpack-schedule-policy",
                "userguide/metax-device/metax-gpu/spread-schedule-policy",
                {
                  type: "category",
                  label: "Examples",
                  key: "metax-gpu-examples",
                  items: [
                    "userguide/metax-device/metax-gpu/examples/allocate-metax-device",
                    "userguide/metax-device/metax-gpu/examples/binpack-schedule-policy",
                    "userguide/metax-device/metax-gpu/examples/spread-schedule-policy",
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Share Ascend devices",
          items: [
            "userguide/ascend-device/enable-ascend-sharing",
            "userguide/ascend-device/ascend-device-template",
            {
              type: "category",
              label: "Examples",
              key: "ascend-examples",
              items: [
                "userguide/ascend-device/examples/allocate-310p",
                "userguide/ascend-device/examples/allocate-910b",
                "userguide/ascend-device/examples/allocate-exclusive",
                "userguide/ascend-device/examples/allocate-soft-slicing",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Scheduler Integrations",
          items: [
            {
              type: "category",
              label: "Volcano vGPU",
              items: [
                {
                  type: "category",
                  label: "NVIDIA GPU",
                  items: [
                    "userguide/volcano-vgpu/nvidia-gpu/volcano-vgpu-device-plugin-for-kubernetes",
                    "userguide/volcano-vgpu/nvidia-gpu/monitor-volcano-vgpu",
                    {
                      type: "category",
                      label: "Examples",
                      key: "volcano-vgpu-examples",
                      items: [
                        "userguide/volcano-vgpu/nvidia-gpu/examples/default-vgpu-job",
                        "userguide/volcano-vgpu/nvidia-gpu/examples/exclusive-gpu-usage",
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "category",
              label: "Using HAMi with Kueue",
              items: [
                "userguide/kueue/how-to-use-kueue-on-hami",
                {
                  type: "category",
                  label: "Examples",
                  key: "kueue-examples",
                  items: ["userguide/kueue/examples/default-kueue-usage"],
                },
              ],
            },
            {
              type: "category",
              label: "Using HAMi with KAI Scheduler",
              items: ["userguide/kai-scheduler/how-to-use-kai-scheduler"],
            },
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Developer Guide",
      link: {
        type: "generated-index",
        title: "Developer Guide",
        description: "Architecture deep dive, build workflow and scheduler internals.",
      },
      items: [
        "developers/build",
        "developers/protocol",
        "developers/scheduling",
        "developers/hami-core-design",
        "developers/dynamic-mig",
        "developers/gpu-topology-scheduling",
        "developers/kunlunxin-topology",
        "developers/profiling-scheduler",
        "developers/scheduler-event-log",
        "developers/gpu-utilization-metrics",
        "developers/hami-vnpu-core-integration",
        "developers/hami-webui-development-guide",
        "developers/mindmap",
        "diagrams-inventory",
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
        "contributor/e2e-testing",
      ],
    },
    {
      type: "doc",
      id: "troubleshooting/troubleshooting",
    },
    {
      type: "doc",
      id: "faq/faq",
    },
  ],
};

