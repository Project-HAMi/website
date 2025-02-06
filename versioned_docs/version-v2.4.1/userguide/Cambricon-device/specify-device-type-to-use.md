---
title: Assign to certain device type
---

## Assign to certain device type

You need to add parameters `- --enable-device-type` in `cambricon-device-plugin` in order to support device type specification.When this option is set, different types of MLUs will generate different resource names，such as `cambricon.com/mlu370.smlu.vcore` and `cambricon.com/mlu370.smlu.vmemory`.

```
      resources:
        limits:
          cambricon.com/vmlu: 1 # requesting 1 MLU
          cambricon.com/mlu370.smlu.vmemory: "20" # Each GPU contains 20% device memory
          cambricon.com/mlu370.smlu.vcore: "10" # Each GPU contains 10% compute cores
```

