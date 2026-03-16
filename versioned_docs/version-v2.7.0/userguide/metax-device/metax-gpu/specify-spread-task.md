---
title: Spread schedule policy
---

To allocate metax device with best performance, you need to only assign `metax-tech.com/gpu` with annotations `hami.io/node-scheduler-policy: "spread"`.

```yaml
metadata:
  annotations: 
    hami.io/node-scheduler-policy: "spread" # when this parameter is set to spread, the scheduler will try to find the best topology for this task.
```
