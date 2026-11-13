---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过可选资源 `cambricon.com/mlu.smlu.vmemory` 分配固定大小的设备显存。HAMi 将每个单位计为 256 MiB，与 [MLU 共享指南](./enable-cambricon-mlu-sharing.md)中的插件配置 `min-dsmlu-unit=256` 对应。

请使用纯整数，不要添加 `Mi`、`Gi` 或 `G` 等后缀。该值表示显存单位数，不是百分比。例如，`20` 个单位分配 5120 MiB（5 GiB）显存。

```yaml
resources:
  limits:
    cambricon.com/vmlu: 1 # 请求 1 个 MLU
    cambricon.com/mlu.smlu.vmemory: "20" # 分配 20 x 256 MiB = 5 GiB
```

:::note

根据 cambricon-device-plugin 的参数，资源名称可以是 `cambricon.com/mlu370.smlu.vmemory` 或其他类型

:::
