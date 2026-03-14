---
title: Assign to certain device type
---

To enable device type specification, you need to add the `--enable-device-type` parameter to the `cambricon-device-plugin`.

When this option is enabled, different MLU types will expose distinct resource names. For example:

- `cambricon.com/mlu370.smlu.vcore`  
- `cambricon.com/mlu370.smlu.vmemory`

This allows fine-grained control over resource allocation based on MLU model types.
You can specify these resources in your container specification like this:

```yaml
      resources:
        limits:
          cambricon.com/vmlu: 1 # requesting 1 MLU
          cambricon.com/mlu370.smlu.vmemory: "20" # Each GPU contains 20% device memory
          cambricon.com/mlu370.smlu.vcore: "10" # Each GPU contains 10% compute cores
```
