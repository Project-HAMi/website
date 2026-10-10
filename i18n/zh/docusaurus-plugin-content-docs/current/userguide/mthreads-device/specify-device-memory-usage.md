---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过指定资源 `mthreads.com/sgpu-memory` 来分配部分设备显存。可选项。每个单位等于 512 MiB。请使用纯整数，不要添加 `Mi`、`Gi` 或 `G` 等后缀；该值表示显存单位数，不是百分比。

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1 # 请求 1 个 GPU
    mthreads.com/sgpu-memory: 32 # 分配 32 x 512 MiB = 16 GiB
```

最大值与有效取值取决于卡型号：

| 卡型号    | 显存   | 有效 `sgpu-memory` 取值       |
| --------- | ------ | ----------------------------- |
| MTT S4000 | 48 GiB | 2、4、8、16、32、64、96       |
| MTT S5000 | 80 GiB | 2、4、8、16、32、64、128、160 |

取值不在列表内的请求会在准入时被拒绝。MTT S5000 集群在安装 HAMi 时需将 `devices.mthreads.memoryPerCard` 设置为 `[160]`。详见[启用 Mthreads GPU 共享](enable-mthreads-gpu-sharing.md)。
