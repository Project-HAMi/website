---
title: Allocate device memory
---

Allocate device memory by specifying the `hygon.com/dcumem` resource. This field is optional. Each unit of `hygon.com/dcumem` represents 1 MiB of device memory.

```yaml
resources:
  limits:
    hygon.com/dcunum: 1 # requesting 1 DCU
    hygon.com/dcumem: 2000 # 2000 units x 1 MiB = 2000 MiB of device memory
```

:::warning

Set `hygon.com/dcumem` as a **plain integer** (a count of MiB), not a Kubernetes quantity. A suffixed value such as `16Gi` is parsed as its byte count (about 17 billion), which overflows HAMi's 32-bit memory field and is silently truncated, often to `0`. A zero memory request passes the scheduler's memory check unconditionally, so the pod can be placed on a DCU that is already full and then fails with out-of-memory errors at runtime. Use the integer form shown above (for example `2000`).

:::
