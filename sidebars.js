const { Component } = require("react");

module.exports = {
  docs: [
    {
      type: "category",
      label: "Core Concepts",
      collapsed: false,
      items: ["core-concepts/introduction"],
    },
    {
      type: "category",
      label: "Get Started",
      items: ["get-started/nginx-example"],
    },
    {
      type: "category",
      label: "Installation",
      items: [
        "installation/prequisities",
        "installation/webui-installation",
        "installation/upgrade",
        "installation/uninstall",
      ],
    },
    {
      type: "category",
      label: "User Guide",
      items: [
        "userguide/configure",
        "userguide/support-devices",
        {
          type: "category",
          label: "Share NVIDIA GPU devices",
          items: [
            "userguide/NVIDIA-device/specify-device-memory-usage",
            "userguide/NVIDIA-device/specify-device-core-usage",
            "userguide/NVIDIA-device/specify-device-type-to-use",
            "userguide/NVIDIA-device/specify-device-uuid-to-use",
            {
              type: "category",
              label: "Examples",
              items: [
                "userguide/NVIDIA-device/examples/use-exclusive-card",
                "userguide/NVIDIA-device/examples/allocate-device-memory",
                "userguide/NVIDIA-device/examples/allocate-device-memory2",
                "userguide/NVIDIA-device/examples/allocate-device-core",
                "userguide/NVIDIA-device/examples/specify-card-type-to-use",
                "userguide/NVIDIA-device/examples/specify-certain-card",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Share Cambricon MLU devices",
          items: [
            "userguide/Cambricon-device/enable-cambricon-mlu-sharing",
            "userguide/Cambricon-device/specify-device-memory-usage",
            "userguide/Cambricon-device/specify-device-core-usage",
            "userguide/Cambricon-device/specify-device-type-to-use",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Contributor Guide",
      items: [
        "contributor/contribute-docs",
        "contributor/cherry-picks",
        "contributor/github-workflow",
        "contributor/lifted",
      ],
    },
    {
      type: "doc",
      id: "contributor/adopters",
    },
    {
      type: "doc",
      id: "releases",
    },
  ],
};
