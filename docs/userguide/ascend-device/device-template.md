---
title: Huawei Ascend device template
---

Huawei Ascend templates describe the memory, AI cores, and optional AI CPU cores available in a hardware slice. HAMi selects a template that satisfies the workload request.

## Configure templates

Use `devices.ascend.configs` in the HAMi values file. The Chart writes this list to `vnpus.configs` in the global device ConfigMap shared with the Ascend plugin. Do not manually edit that ConfigMap; see [Global device configuration](../configure.md#device-config-overrides).

Keep the defaults for supported models. The [values source](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml) contains the complete chip definitions and templates; the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md) explains each field. An override replaces the entire `configs` list, so retain every model the cluster needs. If resource names change, also update `devices.ascend.customresources` and keep the plugin configuration consistent.

For example, the default 910B3 configuration includes `vir05_1c_16g` with 16384 MiB, 5 AI cores, and 1 AI CPU core. Memory and compute are determined by the selected template; they are not independent percentages in template mode.

Template names must be supported by the device driver. Editing memory or core numbers does not create a new hardware template. See [Ascend sharing](./enable-ascend-sharing.md) for deployment and workload examples.
