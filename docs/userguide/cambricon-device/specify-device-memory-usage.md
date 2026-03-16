---
title: Allocate device memory
---

To allocate a percentage of device memory, specify resources such as `cambricon.com/mlu.smlu.vmemory`.

This field is optional. Each unit of `cambricon.com/mlu.smlu.vmemory` represents 1% of the device's total memory.

```yaml
      resources:
        limits:
          cambricon.com/vmlu: 1 # requesting 1 MLU
          cambricon.com/mlu.smlu.vmemory: "20" # Each GPU contains 20% device memory
```

:::note

Depending on the parameters of cambricon-device-plugin, resource name can be `cambricon.com/mlu370.smlu.vmemory` or other types.

:::
