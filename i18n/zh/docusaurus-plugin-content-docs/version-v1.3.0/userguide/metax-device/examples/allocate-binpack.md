---
title: Binpack schedule policy
---

## Allocate metax device using binpack schedule policy

To allocate metax device with minimum damage to topology, you need to only assign `metax-tech.com/gpu` with annotations `hami.io/node-scheduler-policy`=`binpack`

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
  annotations: 
    hami.io/node-scheduler-policy: "binpack" # when this parameter is set to binpack, the scheduler will try to minimize the topology loss.
spec:
  containers:
    - name: ubuntu-container
      image: cr.metax-tech.com/public-ai-release/c500/colossalai:2.24.0.5-py38-ubuntu20.04-amd64 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/gpu: 1 # requesting 1 metax GPU
```