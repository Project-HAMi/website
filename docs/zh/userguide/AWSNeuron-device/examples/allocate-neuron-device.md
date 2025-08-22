---
title: 分配AWS Neuron核心
---

如需独占分配一个或多个aws neuron设备，可通过`aws.amazon.com/neuron`进行资源分配：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: npod
spec:
  restartPolicy: Never
  containers:
    - name: npod
      command: ["sleep","infinity"]
      image: public.ecr.aws/neuron/pytorch-inference-neuron:1.13.1-neuron-py310-sdk2.20.2-ubuntu20.04
      resources:
        limits:
          cpu: "4"
          memory: 4Gi
          aws.amazon.com/neuron: 2
        requests:
          cpu: "1"
          memory: 1Gi
```
