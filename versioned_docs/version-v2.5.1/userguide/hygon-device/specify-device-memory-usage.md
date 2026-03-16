---
title: Allocate device memory
---

## Allocate device memory to container

Allocate a percentage size of device memory by specify resources such as `hygon.com/dcumem`.
Optional, Each unit of `hygon.com/dcumem` equals to 1M device memory.

```
      resources:
        limits:
          hygon.com/dcunum: 1 # requesting 1 DCU
          hygon.com/dcumem: 2000 # Each DCU contains 2000M device memory
```
