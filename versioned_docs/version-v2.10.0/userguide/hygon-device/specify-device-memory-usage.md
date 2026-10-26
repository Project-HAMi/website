---
title: Allocate device memory
---

Allocate a fixed size of device memory with the optional `hygon.com/hcumem` resource. With the default `memoryFactor: 1`, each unit equals 1 MiB.

Use a plain integer without suffixes such as `Mi`, `Gi`, or `G`. For example, request `16384` for 16 GiB with the default memory factor. The value is a count of memory units, not a percentage.

```yaml
resources:
  limits:
    hygon.com/hcunum: 1 # requesting 1 HCU
    hygon.com/hcumem: 2000 # Allocate 2000 MiB per HCU
```
