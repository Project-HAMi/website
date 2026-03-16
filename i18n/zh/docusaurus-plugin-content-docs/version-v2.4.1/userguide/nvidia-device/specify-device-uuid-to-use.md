---
title: Assign to certain device
---

## Assign to certain device type

Sometimes a task may wish to run on a certain GPU, it can fill the `nvidia.com/use-gpuuuid` field in pod annotation. HAMi scheduler will try to fit in device with that uuid.

For example, a task with the following annotation will be assigned to the device with uuid `GPU-123456`

```
metadata:
  annotations:
    nvidia.com/use-gpuuuid: "GPU-123456"
```

> **NOTICE:** *Each GPU UUID is unique in a cluster, so assign a certain UUID means assigning this task to certain node with that GPU*