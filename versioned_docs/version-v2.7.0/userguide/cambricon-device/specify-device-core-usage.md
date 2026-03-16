---
title: Allocate device core usage
---

To allocate a percentage of device core resources, specify the `cambricon.com/mlu.smlu.vcore` resource.

This field is optional. Each unit of `cambricon.com/mlu.smlu.vcore` represents 1% of the device's compute cores.

```yaml
      resources:
        limits:
          cambricon.com/vmlu: 1 # requesting 1 MLU
          cambricon.com/mlu.smlu.vcore: "10" # Each MLU contains 10% device cores
```

:::note

Depending on the parameters of cambricon-device-plugin, resource name can be `cambricon.com/mlu370.smlu.vcore` or other types.

:::
