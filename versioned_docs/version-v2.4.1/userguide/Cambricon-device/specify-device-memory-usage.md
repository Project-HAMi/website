---
title: Allocate device memory
---

## Allocate device memory to container

Allocate a percentage size of device memory by specify resources such as `cambricon.com/mlu.smlu.vmemory`.
Optional, Each unit of `cambricon.com/mlu.smlu.vmemory` equals to 1% of device memory.

```
      resources:
        limits:
          cambricon.com/mlu: 1 # requesting 1 MLU
          cambricon.com/mlu.smlu.vmemory: "20" # Each GPU contains 20% device memory
```

> **NOTICE:** *Depending on the parameters of cambricon-device-plugin, resource name can be `cambricon.com/mlu370.smlu.vmemory` or other types*