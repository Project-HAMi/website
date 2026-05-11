---
title: Allocate device core to container
linktitle: Allocate device core usage
---

Allocate a percentage of device core resources by specifying resource `hygon.com/dcucores`.
Optional, each unit of `hygon.com/dcucores` equals 1% of device cores.

```yaml
      resources:
        limits:
          hygon.com/dcunum: 1 # requesting 1 DCU
          hygon.com/dcucores: 15 # Each DCU allocates 15% device cores.
```
