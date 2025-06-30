---
title: 分配设备核心给容器
translated: true
---

## 分配设备核心给容器

通过指定资源 `cambricon.com/mlu.smlu.vcore` 来分配设备核心资源的百分比。
可选项，每个 `cambricon.com/mlu.smlu.vcore` 单位等于设备核心的 1%。

```
      resources:
        limits:
          cambricon.com/vmlu: 1 # 请求 1 个 MLU
          cambricon.com/mlu.smlu.vcore: "10" # 每个 MLU 包含 10% 的设备核心
```

> **注意：** *根据 cambricon-device-plugin 的参数，资源名称可以是 `cambricon.com/mlu370.smlu.vcore` 或其他类型*
