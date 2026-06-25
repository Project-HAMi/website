---
title: 图表清单
translated: true
---

本页面编目了仓库中的所有图表：`docs/`、`blog/`、`i18n/`、`versioned_docs/` 和 `static/`。它是 [#421](https://github.com/Project-HAMi/website/issues/421) 中跟踪的图表重绘工作的输入依据。

**范围说明：** 博客中的活动照片（KubeCon 展位照、主题演讲照片、演讲者照片）被排除在外——它们是照片，而非技术图表。此处仅列出了传达架构、流程或系统行为的图片。

---

## 图例

| 字段 | 取值 |
| --- | --- |
| Format | SVG、PNG、JPG、JPEG、PlantUML |
| Status | `current` - 准确且最新；`outdated` - 术语或结构已过时；`unknown` - 不进行可视化检查无法核实内容；`screenshot` - UI 截图，非图表 |
| Source file | 可编辑源文件路径（`.plantuml`、`.drawio`、`.graffle`），或 `none` |
| Control/data plane | `separated` - 明确分离；`partial` - 混合；`n/a` - 不适用于此图表类型 |

---

## 1. 核心概念 - 架构与流程图

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/core-concepts/architect.jpg` | JPG | `docs/core-concepts/architecture.md`、`i18n/zh/.../core-concepts/architecture.md`、所有版本化版本 | none | outdated（JPG，非 SVG；无源文件） | not separated |
| `static/img/docs/common/core-concepts/device-plugin-flow-en.svg` | SVG | `docs/core-concepts/gpu-virtualization.md` | `docs/core-concepts/device-plugin-flow.plantuml` | current | n/a（时序图） |
| `static/img/docs/common/core-concepts/device-plugin-flow.svg` | SVG | `i18n/zh/.../core-concepts/gpu-virtualization.md` | `i18n/zh/.../core-concepts/device-plugin-flow.plantuml` | current | n/a（时序图） |
| `static/img/docs/common/core-concepts/hami-architecture-en.svg` | SVG | `docs/core-concepts/gpu-virtualization.md` | `docs/core-concepts/hami-architecture.plantuml` | current | partial |
| `static/img/docs/common/core-concepts/hami-architecture.svg` | SVG | `i18n/zh/.../core-concepts/gpu-virtualization.md` | `i18n/zh/.../core-concepts/hami-architecture.plantuml` | current | partial |

**备注：**

- `architect.jpg` 是 `docs/core-concepts/architecture.md` 中使用的主要架构概览图。它是 JPG 格式，没有可编辑源文件。必须重绘为 SVG 并附带源文件。
- 两个基于 PlantUML 的 SVG（`device-plugin-flow-*.svg`、`hami-architecture-*.svg`）有源文件，状态良好。重绘时应检查控制/数据平面的分离情况。

---

## 2. 开发者文档 - HAMi 核心设计

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/hami-core-design/hami-arch.png` | PNG | `docs/developers/hami-core-design.md`、中文对应版本 | none | unknown | not separated |
| `static/img/docs/common/developers/hami-core-design/hami-core-position.png` | PNG | `docs/developers/hami-core-design.md`、中文对应版本 | none | unknown | not separated |
| `static/img/docs/common/developers/hami-core-design/sample-nvidia-smi.png` | PNG | `docs/developers/hami-core-design.md`、中文对应版本 | none | screenshot | n/a |

**备注：**

- `hami-arch.png` 和 `hami-core-position.png` 没有源文件。两者都必须重新创建为 SVG，并附带可编辑源文件。
- `sample-nvidia-smi.png` 是一张终端截图，展示虚拟化 GPU 内存输出。它不是架构图，无需重绘，但如果命令输出发生变化，可能需要更新。

---

## 3. 开发者文档 - 调度

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/scheduling/scheduler-policy-story.png` | PNG | `docs/developers/scheduling.md`、中文对应版本 | none | unknown | not separated |
| `static/img/docs/common/developers/scheduling/node-scheduler-policy-demo.png` | PNG | `docs/developers/scheduling.md`、中文对应版本 | none | unknown | not separated |
| `static/img/docs/common/developers/scheduling/gpu-scheduler-policy-demo.png` | PNG | `docs/developers/scheduling.md`、中文对应版本 | none | unknown | not separated |

**备注：**

- 所有三个调度图都是 PNG，没有源文件。必须重绘为 SVG。
- 这些图描述了 Binpack 和 Spread 调度策略逻辑。它们出现在最新的 `docs/developers/scheduling.md` 及其中文对应版本中。

---

## 4. 开发者文档 - 协议

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/protocol/protocol-register.png` | PNG | `docs/developers/protocol.md`（仅英文） | none | unknown | not separated |
| `static/img/docs/common/developers/protocol/device-registration.png` | PNG | `i18n/zh/.../developers/protocol.md`（仅中文） | none | unknown | not separated |
| `static/img/docs/common/developers/protocol/task-dispatch.png` | PNG | `i18n/zh/.../developers/protocol.md`（仅中文） | none | unknown | not separated |

**发现的不一致：** 英文版 `docs/developers/protocol.md` 仅引用了 `protocol-register.png`。中文版引用了 `device-registration.png` 和 `task-dispatch.png`——这是两个不同的文件，它们并未出现在英文文档中。英文文档似乎缺少了任务分派图。这一不一致必须在重绘之前解决。

---

## 5. 开发者文档 - WebUI 架构

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/hami-webui-architecture-diagram.svg` | SVG | `docs/developers/hami-webui-development-guide.md`、中文对应版本、`blog/hami-webui-v1-1-0-release/index.md` | none | current | not separated |

**备注：**

- 此图已经是 SVG，这是正确的。但是，它没有可编辑的源文件（没有 `.drawio` 或 `.graffle`）。下次更新时必须向 `static/img/src/` 添加源文件。

---

## 6. 开发者文档 - 动态 MIG

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/en/dynamic-mig/hami-dynamic-mig-structure.png` | PNG | `docs/developers/dynamic-mig.md`、中文对应版本、所有版本化版本 | none | unknown | not separated |
| `static/img/docs/en/dynamic-mig/hami-dynamic-mig-procedure.png` | PNG | `docs/developers/dynamic-mig.md`、中文对应版本、所有版本化版本 | none | unknown | not separated |

**备注：**

- 两张图片均为 PNG，无源文件。被英文和中文当前文档以及所有版本化文档引用。
- 它们是近期添加的（master 的更新将它们作为新文件包含在内）。它们相对于当前代码库的准确性未知。

---

## 7. 开发者文档 - 昆仑芯拓扑

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/developers/kunlunxin-topology/kunlunxin-filter.png` | PNG | `docs/developers/kunlunxin-topology.md`、中文对应版本 | none | unknown | not separated |

---

## 8. 关键特性图

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/key-features/example.png` | PNG | `docs/key-features/device-sharing.md`、中文对应版本 | none | unknown | n/a |
| `static/img/docs/common/key-features/hard-limit.jpg` | JPG | `docs/key-features/device-resource-isolation.md`、中文对应版本 | none | unknown | n/a |

**仅版本化文档中的关键特性图（当前 `docs/` 中未引用）：**

| 图片路径 | Format | 引用位置 | Source file | Status |
| --- | --- | --- | --- | --- |
| `static/img/docs/common/key-features/features/overall-relationship.png` | PNG | 仅 `versioned_docs/version-v2.4.1`、`version-v2.5.0` | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/overall-scheduling.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/overall-rescheduling.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/cluster-failover.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/unified-operation.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/unified-search.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/unified-access.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/unified-resourcequota.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |
| `static/img/docs/common/key-features/features/service-governance.png` | PNG | 仅版本化文档 | none | 在当前文档中已孤立 |

**备注：**

- 这 9 张 `features/` 图片仅被 `versioned_docs/version-v2.4.1/key-features/features.md` 和 `version-v2.5.0/key-features/features.md` 引用。它们不出现在任何当前 `docs/` 页面中。必须为版本化文档渲染保留，但不是当前文档集中重绘的候选项。
- `hard-limit.jpg` 是 JPG。应转换为 PNG 或 SVG。

---

## 9. 思维导图

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/en/mindmap/hami-vgpu-mind-map-en.png` | PNG | `docs/developers/mindmap.md`、所有版本化版本 | none | unknown | n/a |
| `static/img/docs/zh/mindmap/hami-vgpu-mind-map-zh.png` | PNG | `i18n/zh/.../developers/mindmap.md`、所有版本化版本 | none | unknown | n/a |

**备注：**

- 两张思维导图的标题均为 "HAMi VGPU mind map"。"VGPU" 的范围窄于 HAMi 当前的支持面，后者现在除了 NVIDIA VGPU 之外，还覆盖寒武纪 MLU、海光 DCU、昆仑芯 XPU、沐曦 GPU、天数智芯 Corex 和昇腾 NPU。
- 两张思维导图都没有可编辑的源文件。更新它们需要完全重绘。
- 仅凭此清单无法在不进行 PNG 文件可视化检查的情况下评估完整的内容准确性。熟悉当前 HAMi 架构的维护者必须在做出任何更新或移除决定之前进行审查。
- 在 issue [#414](https://github.com/Project-HAMi/website/issues/414) 中跟踪重新设计工作。

---

## 10. 设备用户指南图

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/userguide/metax-device/metax-gpu/metax-topology.jpg` | JPG | `docs/userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md`、中文对应版本 | none | unknown | not separated |
| `static/img/docs/common/userguide/metax-device/metax-gpu/metax-spread.jpg` | JPG | `docs/userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md`、中文对应版本 | none | unknown | not separated |
| `static/img/docs/common/userguide/metax-device/metax-gpu/metax-binpack.jpg` | JPG | `docs/userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md`、中文对应版本 | none | unknown | not separated |
| `static/img/docs/common/userguide/kunlunxin-device/kunlunxin-topology.jpg` | JPG | `docs/userguide/kunlunxin-device/enable-kunlunxin-schedule.md`、`docs/developers/kunlunxin-topology.md`、中文对应版本 | none | unknown | not separated |

**备注：**

- 所有设备用户指南图都是 JPG。根据 WS4 的要求，必须重绘为 SVG。
- 沐曦 GPU 图涵盖 PCIe 拓扑、Spread 调度策略和 Binpack 调度策略。
- 昆仑芯拓扑图展示 P800 服务器上的 NUMA 节点连接。

---

## 11. WebUI 截图

这些是 UI 截图，而非架构图或流程图。它们无需重绘，但在 WebUI 更新时可能需要刷新。

| 图片路径 | Format | 引用位置 |
| --- | --- | --- |
| `static/img/docs/en/userguide/webui-overview.png` | PNG | `docs/userguide/hami-webui-user-guide.md`、`blog/hami-webui-v1-1-0-release/index.md` |
| `static/img/docs/en/userguide/webui-node-list.png` | PNG | 同上 |
| `static/img/docs/en/userguide/webui-node-detail.png` | PNG | 同上 |
| `static/img/docs/en/userguide/webui-accelerator-list.png` | PNG | 同上 |
| `static/img/docs/en/userguide/webui-accelerator-detail.png` | PNG | 同上 |
| `static/img/docs/en/userguide/webui-workload-list.png` | PNG | 同上 |
| `static/img/docs/en/userguide/webui-workload-detail.png` | PNG | 同上 |
| `static/img/docs/zh/userguide/webui-*.png`（7 个文件） | PNG | 中文用户指南 |

---

## 12. 贡献者指南图

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/docs/common/contributor/github-workflow/git-workflow.png` | PNG | `docs/contributor/github-workflow.md`、中文对应版本 | none | unknown | n/a |

---

## 13. 首页组件图

| 图片路径 | Format | 引用位置 | Source file | Status | Control/data plane |
| --- | --- | --- | --- | --- | --- |
| `static/img/gpu-sharing-diagram.svg` | SVG | `src/components/BeforeAfterComparison.js` | none | unknown | not separated |
| `static/img/gpu-sharing-diagram-zh.svg` | SVG | `src/components/BeforeAfterComparison.js` | none | unknown | not separated |

**备注：**

- 这些 SVG 在首页对比组件中渲染。它们已经是 SVG 格式。缺少源文件（`.drawio` 或类似文件）。

---

## 14. 博客 - 技术图

| 图片路径 | Format | 引用位置 | Source file | Status |
| --- | --- | --- | --- | --- |
| `static/img/blog/flowchart.jpeg` | JPEG | `blog/2024-12-31-post/index.md` | none | unknown |

**备注：**

- `blog/2024-12-31-post/index.md` 还引用了一个托管在 GitHub（`raw.githubusercontent.com`）上的外部图片。外部图片托管很脆弱，应迁移到 `static/img/`。

---

## 清点过程中发现的已知问题

### 损坏的图片引用

`docs/contributor/contribute-docs.md`（第 153 行）引用了：

```text
/img/docs/common/architecture/hami-arch.png
```

目录 `static/img/docs/common/architecture/` 不存在。该路径下的文件也不存在。HAMi 核心架构图的正确路径为：

```text
/img/docs/common/developers/hami-core-design/hami-arch.png
```

这是一个损坏的链接，会导致渲染页面中图片缺失。

### 协议图不一致（英文版 vs. 中文版）

英文版 `docs/developers/protocol.md` 仅引用了 `protocol-register.png`（设备注册）。

中文版 `i18n/zh/.../developers/protocol.md` 引用了 `device-registration.png` 和 `task-dispatch.png` 两张图。

英文页面缺少任务分派图。在任一页面被视为完成之前，必须对此进行核对。

---

## 总结：需要重绘为 SVG 的图表

[#421](https://github.com/Project-HAMi/website/issues/421) 中重绘工作的优先级列表：

| 优先级 | 图片 | 当前格式 | 原因 |
| --- | --- | --- | --- |
| High | `static/img/docs/common/core-concepts/architect.jpg` | JPG | 主要架构概览；新用户的主要入口 |
| High | `static/img/docs/common/developers/hami-core-design/hami-arch.png` | PNG | 核心内部设计图，无源文件 |
| High | `static/img/docs/common/developers/hami-core-design/hami-core-position.png` | PNG | 核心内部设计图，无源文件 |
| High | `static/img/docs/en/mindmap/hami-vgpu-mind-map-en.png` | PNG | 范围过时（仅 "VGPU"），无源文件 - 见 [#414](https://github.com/Project-HAMi/website/issues/414) |
| High | `static/img/docs/zh/mindmap/hami-vgpu-mind-map-zh.png` | PNG | 同上 |
| Medium | `static/img/docs/common/developers/scheduling/scheduler-policy-story.png` | PNG | 无源文件 |
| Medium | `static/img/docs/common/developers/scheduling/node-scheduler-policy-demo.png` | PNG | 无源文件 |
| Medium | `static/img/docs/common/developers/scheduling/gpu-scheduler-policy-demo.png` | PNG | 无源文件 |
| Medium | `static/img/docs/common/developers/protocol/protocol-register.png` | PNG | 无源文件；必须先解决英文/中文不一致问题 |
| Medium | `static/img/docs/common/developers/protocol/device-registration.png` | PNG | 无源文件；仅中文版 |
| Medium | `static/img/docs/common/developers/protocol/task-dispatch.png` | PNG | 无源文件；仅中文版，英文版缺失 |
| Medium | `static/img/docs/en/dynamic-mig/hami-dynamic-mig-structure.png` | PNG | 无源文件 |
| Medium | `static/img/docs/en/dynamic-mig/hami-dynamic-mig-procedure.png` | PNG | 无源文件 |
| Low | `static/img/docs/common/userguide/metax-device/metax-gpu/metax-topology.jpg` | JPG | 设备特定，无源文件 |
| Low | `static/img/docs/common/userguide/metax-device/metax-gpu/metax-spread.jpg` | JPG | 设备特定，无源文件 |
| Low | `static/img/docs/common/userguide/metax-device/metax-gpu/metax-binpack.jpg` | JPG | 设备特定，无源文件 |
| Low | `static/img/docs/common/userguide/kunlunxin-device/kunlunxin-topology.jpg` | JPG | 设备特定，无源文件 |
| Low | `static/img/docs/common/key-features/hard-limit.jpg` | JPG | 应为 PNG 或 SVG |
| Low | `static/img/docs/common/developers/kunlunxin-topology/kunlunxin-filter.png` | PNG | 无源文件 |
| Low | `static/img/docs/common/contributor/github-workflow/git-workflow.png` | PNG | 无源文件 |
| Low | `static/img/gpu-sharing-diagram.svg` | SVG | 已是 SVG；仅缺少源文件 |
| Low | `static/img/gpu-sharing-diagram-zh.svg` | SVG | 已是 SVG；仅缺少源文件 |
