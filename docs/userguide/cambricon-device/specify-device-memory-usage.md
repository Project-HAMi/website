---
title: Allocate device memory
---

To allocate a percentage of device memory, specify resources such as `cambricon.com/mlu.smlu.vmemory`.

This field is optional. Each unit of `cambricon.com/mlu.smlu.vmemory` represents 1% of the device's total memory.

```yaml
resources:
  limits:
    cambricon.com/vmlu: 1 # requesting 1 MLU
    cambricon.com/mlu.smlu.vmemory: "20" # Each MLU contains 20% device memory
```

:::warning

Set `cambricon.com/mlu.smlu.vmemory` as a **plain integer** (here, a percentage from 1 to 100), not a Kubernetes quantity. A suffixed value such as `16Gi` is parsed as its byte count (about 17 billion), which overflows HAMi's 32-bit memory field and is silently truncated, often to `0`. A zero memory request passes the scheduler's memory check unconditionally, so the pod can be placed on an MLU that is already full and then fails with out-of-memory errors at runtime. Use the integer form shown above (for example `20`).

:::

:::note

Depending on the parameters of cambricon-device-plugin, resource name can be `cambricon.com/mlu370.smlu.vmemory` or other types.

:::
