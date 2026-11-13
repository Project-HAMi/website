---
title: Allocate device memory
---

Allocate a fixed size of device memory with the optional `cambricon.com/mlu.smlu.vmemory` resource. HAMi accounts for each unit as 256 MiB, matching the `min-dsmlu-unit=256` plugin configuration in the [MLU sharing guide](./enable-cambricon-mlu-sharing.md).

Use a plain integer without suffixes such as `Mi`, `Gi`, or `G`. The value is a count of memory units, not a percentage. For example, `20` units allocate 5120 MiB (5 GiB).

```yaml
resources:
  limits:
    cambricon.com/vmlu: 1 # requesting 1 MLU
    cambricon.com/mlu.smlu.vmemory: "20" # Allocate 20 x 256 MiB = 5 GiB
```

:::note

Depending on the parameters of cambricon-device-plugin, resource name can be `cambricon.com/mlu370.smlu.vmemory` or other types.

:::
