---
title: Assign to certain device
---

## Assign to certain device type

Sometimes a task may wish to run on a certain DCU, it can fill the `hygon.com/use-gpuuuid` field in pod annotation. HAMi scheduler will try to fit in device with that uuid.

For example, a task with the following annotation will be assigned to the device with uuid `DCU-123456`

```yaml
metadata:
  annotations:
    hygon.com/use-gpuuuid: "DCU-123456"
```

> **NOTICE:** *Each DCU UUID is unique in a cluster, so assign a certain UUID means assigning this task to certain node with that DCU*
