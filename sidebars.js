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
  ],
};
