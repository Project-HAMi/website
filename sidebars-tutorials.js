module.exports = {
  tutorials: [
    "overview",
    {
      type: "category",
      label: "Labs",
      collapsed: false,
      link: {
        type: "generated-index",
        title: "Labs",
        description: "Step-by-step exercises with real captured outputs.",
      },
      items: [
        {
          type: "doc",
          id: "labs/online-install",
          customProps: { level: "Beginner", duration: "about 60 minutes" },
        },
        {
          type: "doc",
          id: "labs/local-fake-gpu",
          customProps: { level: "Beginner", duration: "about 30 minutes" },
        },
        {
          type: "doc",
          id: "labs/gpu-partitioning",
          customProps: { level: "Intermediate", duration: "about 30 minutes" },
        },
        {
          type: "doc",
          id: "labs/hami-dra",
          customProps: { level: "Advanced", duration: "about 45 minutes" },
        },
        {
          type: "doc",
          id: "labs/nvml-mock",
          customProps: { level: "Intermediate", duration: "about 40 minutes" },
        },
        {
          type: "doc",
          id: "labs/hami-vllm",
          customProps: { level: "Intermediate", duration: "about 45 minutes" },
        },
        {
          type: "doc",
          id: "labs/hami-isolation-k3s",
          customProps: { level: "Intermediate", duration: "about 45 minutes" },
        },
        {
          type: "doc",
          id: "labs/volcano-vgpu-gang-queue",
          customProps: { level: "Advanced", duration: "about 60 minutes" },
        },
        {
          type: "doc",
          id: "labs/kueue-hami-vgpu",
          customProps: { level: "Advanced", duration: "about 60 minutes" },
        },
        {
          type: "doc",
          id: "labs/topology-aware-scheduling",
          customProps: { level: "Intermediate", duration: "about 45 minutes" },
        },
        {
          type: "doc",
          id: "labs/hami-kitops",
          customProps: { level: "Intermediate", duration: "about 60 minutes" },
        },
      ],
    },
  ],
};
