---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过可选资源 `hygon.com/hcumem` 分配固定大小的设备显存。在默认配置 `memoryFactor: 1` 下，每个单位等于 1 MiB。

请使用纯整数，不要添加 `Mi`、`Gi` 或 `G` 等后缀。例如，在默认显存系数下，申请 16 GiB 应填写 `16384`。该值表示显存单位数，不是百分比。

```yaml
resources:
  limits:
    hygon.com/hcunum: 1 # 请求 1 个 HCU
    hygon.com/hcumem: 2000 # 每个 HCU 分配 2000 MiB 显存
```
