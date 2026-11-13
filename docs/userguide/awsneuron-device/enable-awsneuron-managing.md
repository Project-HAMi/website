---
title: Enable AWS-Neuron device Sharing
---

## Introduction

AWS Neuron devices are specialized hardware accelerators designed by AWS to optimize machine learning workloads, particularly for deep learning inference and training. They are part of the AWS Inferentia and Trainium families, which provide high performance, cost-effective, and scalable solutions for AI applications on AWS.

HAMi now integrates with the [Neuron scheduler extension](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#deploy-neuron-scheduler-extension), providing the following capabilities:

- **Neuron sharing**: Request whole devices with `aws.amazon.com/neuron`, or individual NeuronCores with `aws.amazon.com/neuroncore`.

- **Topology awareness**: When allocating multiple aws-neuron devices in a container, HAMi ensures these devices are connected to minimize the communication cost between neuron devices. For details about how these devices are connected, refer to [Container Device Allocation On Different Instance Types](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#container-device-allocation-on-different-instance-types).

## Prerequisites

- Neuron-device-plugin
- EC2 instance of type `Inf` or `Trn`

## Enabling Neuron-sharing Support

- Deploy neuron-device-plugin on EC2 neuron nodes according to the AWS document: [Neuron Device Plugin](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#neuron-device-plugin)

Follow [Online installation](../../installation/online-installation.md) to deploy HAMi. The Neuron device plugin is installed separately. HAMi uses `devices.awsneuron.*` for resource names; if you change them, update `devices.awsneuron.customresources` and keep them consistent with the plugin. See the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md).

## Device Granularity

`aws.amazon.com/neuron` requests whole devices; `aws.amazon.com/neuroncore` requests individual NeuronCores. HAMi derives the number of cores per device from the node's reported device and core capacities, so one core is not always half a device. If both resources are requested, the whole-device count takes precedence.

Topology-aware allocation applies when a task needs multiple devices.

## Running Neuron jobs

AWS Neuron devices can now be requested by a container by either using `aws.amazon.com/neuron` or `aws.amazon.com/neuroncore` resource type.

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
      command: ["sleep", "infinity"]
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

Allocate one NeuronCore:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nuropod
spec:
  restartPolicy: Never
  containers:
    - name: nuropod
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

## Selecting by Device UUID

You can specify which Neuron devices to use or exclude using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # Use specific Neuron devices (comma-separated list)
    aws.amazon.com/use-neuron-uuid: "node1-AWSNeuron-0,node1-AWSNeuron-1"
    # Or exclude specific Neuron devices (comma-separated list)
    aws.amazon.com/nouse-neuron-uuid: "node1-AWSNeuron-2,node1-AWSNeuron-3"
spec:
  # ... rest of pod spec
```

:::note

The device ID format is `{node-name}-AWSNeuron-{index}`. You can find the available device IDs in the node annotations.

:::

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

1. `aws.amazon.com/neuroncore` accepts positive integer core counts, not only `1`. Allocation depends on the cores per device and available cores on the selected node.

2. `neuron-ls` inside container shows the total device memory, which is NOT a bug. Device memory will be properly limited when tasks are running.
