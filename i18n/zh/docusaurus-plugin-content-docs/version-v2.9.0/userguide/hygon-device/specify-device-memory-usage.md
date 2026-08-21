---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过指定 `hygon.com/dcumem` 资源来分配设备显存。此字段为可选项，每个 `hygon.com/dcumem` 单位代表 1 MiB 设备显存。

```yaml
resources:
  limits:
    hygon.com/dcunum: 1 # 请求 1 个 DCU
    hygon.com/dcumem: 2000 # 2000 个单位 x 1 MiB = 2000 MiB 设备显存
```

:::warning

请将 `hygon.com/dcumem` 设置为**纯整数**（以 MiB 为单位计数），不要使用 Kubernetes 数量单位。带单位的值（例如 `16Gi`）会被解析为字节数（约 170 亿），从而超出 HAMi 的 32 位显存字段范围并被静默截断，通常截断为 `0`。显存请求为 0 时会无条件通过调度器的显存检查，导致 Pod 被调度到显存已满的设备上，并在运行时发生显存不足（OOM）。请使用上面示例中的整数形式（例如 `2000`）。

:::
