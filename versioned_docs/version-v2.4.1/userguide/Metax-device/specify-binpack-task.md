---
title: Binpack schedule policy
---

## Set schedule policy to binpack

To allocate metax device with minimum damage to topology, you need to only assign `metax-tech.com/gpu` with annotations `hami.io/node-scheduler-policy`=`binpack`

```
metadata:
  annotations: 
    hami.io/node-scheduler-policy: "binpack" # when this parameter is set to binpack, the scheduler will try to minimize the topology loss.
```
