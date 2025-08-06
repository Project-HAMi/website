---
title: Allocate device core usage
---

## Allocate device core to container

Allocate a percentage of device core resources by specify resource `hygon.com/dcucores`.
Optional, each unit of `hygon.com/dcucores` equals to 1% device cores.

```yaml
      resources:
        limits:
          hygon.com/dcunum: 1 # requesting 1 DCU
          hygon.com/dcucores: 15 # Each DCU allocates 15% device cores.
```
