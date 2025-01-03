---
title: Allocate device core usage
---

## Allocate device core to container

Allocate a percentage of device core resources by specify resource `cambricon.com/mlu.smlu.vcore`.
Optional, each unit of `cambricon.com/mlu.smlu.vcore` equals to 1% device cores.

```
      resources:
        limits:
          cambricon.com/mlu: 1 # requesting 1 MLU
          cambricon.com/mlu.smlu.vcore: "10" # Each MLU contains 10% device cores
```

> **NOTICE:** *Depending on the parameters of cambricon-device-plugin, resource name can be `cambricon.com/mlu370.smlu.vcore` or other types*