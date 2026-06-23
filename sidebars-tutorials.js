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
        "labs/online-install",
        "labs/local-fake-gpu",
        "labs/gpu-partitioning",
        "labs/hami-dra",
        "labs/nvml-mock",
      ],
    },
  ],
};
