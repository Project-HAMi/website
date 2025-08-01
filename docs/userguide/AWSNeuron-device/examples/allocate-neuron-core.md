---
title: Allocate AWS Neuron core
---

To allocate 1/2 neuron device, you could allocate a neuroncore, like the example below:

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
          aws.amazon.com/neuroncore: 1
        requests:
          cpu: "1"
          memory: 1Gi
```