---
title: Enable AWS-Neuron device Sharing
---

## Introduction

AWS Neuron devices are specialized hardware accelerators designed by AWS to optimize machine learning workloads, particularly for deep learning inference and training. They are part of the AWS Inferentia and Trainium families, which provide high performance, cost-effective, and scalable solutions for AI applications on AWS.

HAMi now integrates with [my-scheduler](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#deploy-neuron-scheduler-extension), providing the following capabilities:

* **Neuron sharing**: HAMi now supports sharing on aws.amazon.com/neuron by allocating device cores(aws.amazon.com/neuroncore), each Neuron core equals to 1/2 neuron device.

* **Topology awareness**: When allocating multiple aws-neuron devices in a container, HAMi will make sure these devices are connected with one another, so to minimize the communication cost between neuron devices. For details about how these devices are connected, refer to [Container Device Allocation On Different Instance Types](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#container-device-allocation-on-different-instance-types).

## Prerequisites

* Neuron-device-plugin
* EC2 instance of type `Inf` or `Trn`

## Enabling GCU-sharing Support

* Deploy neuron-device-plugin on EC2 neuron nodes according to document the AWS document: [Neuro Device Plugin](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#neuron-device-plugin)

* Deploy HAMi

```bash
helm install hami hami-charts/hami -n kube-system
```

## Device Granularity

HAMi divides each AWS Neuron device into 2 units for resource allocation. You could allocate half of neuron device.

### Neuron Allocation

* Each unit of `aws.amazon.com/neuroncore` represents 1/2 of neuron device
* Don't assign `aws.amazon.com/neuron` like other devices, only assigning `aws.amazon.com/neuroncore` is enough
* When the number of `aws.amazon.com/neuroncore`>=2, it equals to setting `awa.amazon.com/neuron=1/2 * neuronCoreNumber`
* The topology awareness scheduling is automatically enabled when tasks require multiple neuron devices.

## Running Neuron jobs

AWS Neuron devices can now be requested by a container
by either using `aws.amazon.com/neuron` or `aws.amazon.com/neuroncore` resource type.

More examples can be found in examples folder

Allocate a whole device:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nuropod
spec:
  restartPolicy: Never
  containers:
    - name: nuropod
      command: ["sleep","infinity"]
      image: public.ecr.aws/neuron/pytorch-inference-neuron:1.13.1-neuron-py310-sdk2.20.2-ubuntu20.04
      resources:
        limits:
          cpu: "4"
          memory: 4Gi
          aws.amazon.com/neuron: 1
        requests:
          cpu: "1"
          memory: 1Gi
```

Allocate 1/2 Neuron device:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nuropod
spec:
  restartPolicy: Never
  containers:
    - name: nuropod
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

## Selecting by Device UUID

You can specify which GPU devices to use or exclude using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # Use specific GPU devices (comma-separated list)
    aws.amazon.com/use-gpuuuid: "node1-AWSNeuron-0,node1-AWSNeuron-1"
    # Or exclude specific GPU devices (comma-separated list)
    aws.amazon.com/nouse-gpuuuid: "node1-AWSNeuron-2,node1-AWSNeuron-3"
spec:
  # ... rest of pod spec
```

> **NOTE:** The device ID format is `{node-name}-AWSNeuron-{index}`. You can find the available device IDs in the node annotations.

### Finding Device UUIDs

You can find the UUIDs of AWS Neuron devices on a node using the following command:

```bash
kubectl get pod <pod-name> -o yaml | grep -A 10 "hami.io/<card-type>-devices-allocated"
```

Or by examining the node annotations:

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node-register-<card-type>"
```

Look for annotations containing device information in the node status.

## Notes

1. AWS Neuron sharing takes effect only for containers that apply for one AWS Neuron device(i.e `aws.amazon.com/neuroncore`=1 ).

2. `neuron-ls` inside container shows the total device memory, which is NOT a bug. Device memory will be properly limited when tasks are running.
