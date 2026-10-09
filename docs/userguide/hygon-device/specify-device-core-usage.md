---
title: Allocate device core to container
sidebar_label: Allocate device core usage
---

Allocate a percentage of device core resources by specifying resource `hygon.com/hcucores`. Optional, each unit of `hygon.com/hcucores` equals 1% of device cores.

```yaml
resources:
  limits:
    hygon.com/hcunum: 1 # requesting 1 HCU
    hygon.com/hcucores: 15 # Each HCU allocates 15% device cores.
```
