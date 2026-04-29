---
title: Allocate device memory
---

Allocate a percentage size of device memory by specify resources such as `hygon.com/dcumem`.
Optional, each unit of `hygon.com/dcumem` equals 1 MiB of device memory.

```yaml
      resources:
        limits:
          hygon.com/dcunum: 1 # requesting 1 DCU
          hygon.com/dcumem: 2000 # Each DCU contains 2000M device memory
```
