---
title: Huawei Ascend 设备模板
translated: true
---

Huawei Ascend 设备模板描述硬件切片的显存、AI Core 和可选的 AI CPU 核心。HAMi 根据工作负载请求选择能够满足需求的模板。

## 配置设备模板

在 HAMi values 文件中使用 `devices.ascend.configs`。Chart 将该列表写入全局设备 ConfigMap 的 `vnpus.configs`。仅当 HAMi 与 Ascend 插件位于同一命名空间时，才能直接共享该 ConfigMap。插件部署在其他命名空间时，需在插件所在命名空间创建独立的 ConfigMap，并保持其中的 Ascend 配置与 HAMi 的 Helm values 一致。不要手工修改该 ConfigMap，见[全局设备配置](../configure.md#device-config-overrides)。

已支持的型号通常保留默认配置。[values 源码](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)包含完整卡型和模板，[Chart values 表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)说明各字段含义。覆盖 `configs` 会替换整个列表，需保留集群需要的全部型号。修改资源名称时，还需同步更新 `devices.ascend.customresources`，并与插件配置保持一致。

例如，默认 910B3 配置中的 `vir05_1c_16g` 模板包含 16384 MiB 显存、5 个 AI Core 和 1 个 AI CPU 核心。模板模式下，显存和算力由所选模板共同决定，并非可以独立设置的百分比。

模板名称必须受设备驱动支持。修改显存或核心数量不会创建新的硬件模板。部署和工作负载示例见 [Ascend 共享指南](./enable-ascend-sharing.md)。
