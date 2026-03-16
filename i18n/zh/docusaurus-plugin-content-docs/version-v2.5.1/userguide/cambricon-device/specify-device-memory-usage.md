---
title: 为容器分配设备显存
translated: true
---

## 为容器分配设备显存

通过指定资源如 `cambricon.com/mlu.smlu.vmemory` 来分配设备显存的百分比大小。可选项，每个 `cambricon.com/mlu.smlu.vmemory` 单位等于设备显存的 1%。

```yaml
      resources:
        limits:
          cambricon.com/vmlu: 1 # 请求 1 个 MLU
          cambricon.com/mlu.smlu.vmemory: "20" # 每个 GPU 包含 20% 的设备显存
```

> **注意：** *根据 cambricon-device-plugin 的参数，资源名称可以是 `cambricon.com/mlu370.smlu.vmemory` 或其他类型*
