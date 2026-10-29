---
title: 分配 AWS Neuron 核心资源
---

通过 `aws.amazon.com/neuroncore` 申请一个 NeuronCore。每张物理卡的核心数量取决于节点，一个核心不一定等于半张卡。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: npod
spec:
  restartPolicy: Never
  containers:
    - name: npod
      command: ["sleep", "infinity"]
      image: public.ecr.aws/neuron/pytorch-inference-neuron:1.13.1-neuron-py310-sdk2.20.2-ubuntu20.04
      resources:
        limits:
          cpu: "4"
          memory: 4Gi
          aws.amazon.com/neuroncore: 1
        requests:
          cpu: "1"
          memory: 1Gi
```
