---
title: "Chapter 2: One GPU, One Pod"
description: "Install the native NVIDIA device plugin, follow a GPU from the node into a Pod, and see why a model that needs 2 GiB still takes the whole card."
sidebar_label: "2. One GPU, One Pod"
lab:
  level: Beginner
  duration: about 30 minutes
  environment: the Chapter 1 node with one NVIDIA T4
  authors:
    - togettoyou
  verified: "2026-10-07"
tags:
  - nvidia
  - scheduling
toc_max_heading_level: 2
---

## Scenario

The team's GPU node passed every check in Chapter 1. Now they want to run their first model on it. The model needs about 2 GiB of GPU memory, and the T4 has 16 GiB. A second model of the same size is planned right after it, and on paper both fit on the card with room to spare.

This chapter continues on the node from Chapter 1.

## What You'll Understand

- How a device plugin tells Kubernetes that a node has GPUs
- How a Pod that requests `nvidia.com/gpu` ends up with a specific GPU inside its container
- Why the scheduler counts GPUs as whole devices and knows nothing about GPU memory
- Why `nvidia.com/gpu` only accepts whole numbers

## Environment

This chapter adds the following to the Chapter 1 environment:

| Component            | Version                                         |
| -------------------- | ----------------------------------------------- |
| Helm                 | v4.3.0                                          |
| NVIDIA device plugin | v0.20.1                                         |
| Test image           | `pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime` |

## See the Problem First

Deploy the first model. The Pod below stands in for an inference service: it loads 2 GiB of "weights" onto the GPU with PyTorch and keeps running. It asks Kubernetes for one GPU through `nvidia.com/gpu: 1`. Save it as `model-a.yaml`:

```yaml title="model-a.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: model-a
spec:
  restartPolicy: Never
  containers:
    - name: model
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command:
        - python
        - -c
        - |
          import time, torch
          weights = torch.empty(2 * 1024**3, dtype=torch.uint8, device="cuda")
          print("model-a loaded 2 GiB of weights on", torch.cuda.get_device_name(0), flush=True)
          time.sleep(365 * 24 * 3600)
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f model-a.yaml
```

```plaintext
pod/model-a created
```

```bash
kubectl get pod model-a
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
model-a   0/1     Pending   0          5s
```

The Pod stays `Pending`. Ask the scheduler why:

```bash
kubectl get events --field-selector involvedObject.name=model-a
```

```plaintext
LAST SEEN   TYPE      REASON             OBJECT        MESSAGE
12s         Warning   FailedScheduling   pod/model-a   0/1 nodes are available: 1 Insufficient nvidia.com/gpu. no new claims to deallocate, preemption: 0/1 nodes are available: 1 Preemption is not helpful for scheduling.
```

`Insufficient nvidia.com/gpu`. Chapter 1 ended with the same finding: the node's capacity has no `nvidia.com/gpu`. The GPU works on the host and inside containers, but Kubernetes has no record of it, so the scheduler sees zero GPUs on the node.

Leave `model-a` in place. It will start by itself once the node reports a GPU.

## The Principle: How a GPU Becomes a Kubernetes Resource

Kubernetes has no built-in knowledge of GPUs. Hardware vendors add it through the [device plugin](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/) framework. A device plugin is a program, usually run as a DaemonSet, that talks to the kubelet over gRPC on the node. The diagram below shows the full sequence from device plugin startup to a running GPU Pod:

![Device Plugin registration to GPU Pod execution sequence](/img/docs/common/core-concepts/device-plugin-flow-en.svg)

Each step is explained in [GPU Virtualization Principles](/docs/core-concepts/gpu-virtualization#device-plugin). The rest of this chapter observes these steps on the node:

- **③ to ⑤, register and report.** The NVIDIA device plugin finds the GPU through NVML (Layer 3 in Chapter 1), registers `nvidia.com/gpu` with the kubelet, and reports one device per GPU, identified by its UUID. The kubelet publishes the count as node capacity. Step 3 shows this in the plugin logs, the sockets, and the node capacity.
- **⑧ and ⑨, allocate.** When a Pod starts, the kubelet asks the plugin to allocate a device. The NVIDIA plugin answers with `NVIDIA_VISIBLE_DEVICES=<GPU UUID>`, and the NVIDIA runtime from Chapter 1 injects that GPU into the container. Step 4 shows the variable inside the Pod.
- **⑦, schedule.** The scheduler compares the number of GPUs a Pod asks for with the number still free on each node. Step 5 shows what happens when none are left.

The scheduler sees only a count of devices. Each device is either free or taken, and Kubernetes accepts only whole numbers for resources like `nvidia.com/gpu`. GPU memory, compute, and how much of the card a process uses are not part of this model.

## Step 1: Install Helm

The device plugin is installed with Helm, the Kubernetes package manager. Later chapters use Helm too.

```bash
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4 | bash
helm version
```

```plaintext
Preparing to install helm into /usr/local/bin
helm installed into /usr/local/bin/helm
version.BuildInfo{Version:"v4.3.0", GitCommit:"bec5b06ed841fe5269972d864d5177944fd5970f", GitTreeState:"clean", GoVersion:"go1.27.1", KubeClientVersion:"v1.37"}
```

## Step 2: Install the NVIDIA Device Plugin

The device plugin chart only schedules its DaemonSet onto nodes labeled as NVIDIA GPU nodes. In clusters running Node Feature Discovery the label is added automatically. Here, add it by hand:

```bash
kubectl label node <gpu-node-name> nvidia.com/gpu.present=true
```

```plaintext
node/vm-0-4-ubuntu labeled
```

Add the chart repository and install the device plugin:

```bash
helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
helm repo update
```

```plaintext
"nvdp" has been added to your repositories
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "nvdp" chart repository
Update Complete. ⎈Happy Helming!⎈
```

```bash
helm install nvdp nvdp/nvidia-device-plugin \
    --namespace nvidia-device-plugin --create-namespace \
    --version 0.20.1
```

```plaintext
NAME: nvdp
LAST DEPLOYED: Wed Oct  7 00:12:46 2026
NAMESPACE: nvidia-device-plugin
STATUS: deployed
REVISION: 1
DESCRIPTION: Install complete
TEST SUITE: None
```

```bash
kubectl get pods -n nvidia-device-plugin
```

```plaintext
NAME                              READY   STATUS    RESTARTS   AGE
nvdp-nvidia-device-plugin-x2sfp   1/1     Running   0          31s
```

## Step 3: Watch the Device Plugin Register

The device plugin logs each step of the registration from the principle section:

```bash
kubectl logs -n nvidia-device-plugin ds/nvdp-nvidia-device-plugin | grep -E "Detected platform|Starting to serve|Registered device plugin"
```

```plaintext
I1006 16:12:54.190011       1 plugin-manager.go:101] Detected platform: nvml
I1006 16:12:54.202621       1 server.go:142] Starting to serve 'nvidia.com/gpu' on /var/lib/kubelet/device-plugins/nvidia-gpu.sock
I1006 16:12:54.204726       1 server.go:149] Registered device plugin for 'nvidia.com/gpu' with Kubelet
```

The plugin found the GPU through NVML, opened its own socket, and registered `nvidia.com/gpu` with the kubelet. Both sockets are on the node:

```bash
ls -l /var/lib/kubelet/device-plugins/
```

```plaintext
total 4
-rw------- 1 root root 414 Oct  7 00:13 kubelet_internal_checkpoint
srwxr-xr-x 1 root root   0 Oct  6 23:50 kubelet.sock
srwxr-xr-x 1 root root   0 Oct  7 00:12 nvidia-gpu.sock
```

`kubelet.sock` is where device plugins register. `nvidia-gpu.sock` is where the kubelet calls the NVIDIA plugin back. `kubelet_internal_checkpoint` records which device is assigned to which container.

Now look at the node capacity again, with the same command as Chapter 1:

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.capacity}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"206296376Ki","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32472900Ki","nvidia.com/gpu":"1","pods":"110"}
```

`"nvidia.com/gpu":"1"` has appeared. The node now reports one GPU.

## Step 4: Follow the GPU into the Pod

With a GPU on the node, the scheduler places `model-a`. The first start pulls the PyTorch image, which is several GB and can take a few minutes.

```bash
kubectl get pod model-a
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
model-a   1/1     Running   0          6m19s
```

```bash
kubectl logs model-a
```

```plaintext
model-a loaded 2 GiB of weights on Tesla T4
```

Check which GPU the device plugin assigned:

```bash
kubectl exec model-a -- env | grep NVIDIA_VISIBLE_DEVICES
```

```plaintext
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
```

This is the UUID that `nvidia-smi -L` printed on the host in Chapter 1. The device plugin returned it in the Allocate step, and the NVIDIA runtime used it to inject that GPU into the container.

Now look at the GPU from the host:

```bash
nvidia-smi
```

```plaintext
Wed Oct  7 00:17:55 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 580.126.20             Driver Version: 580.126.20     CUDA Version: 13.0     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       On  |   00000000:00:08.0 Off |                  Off |
| N/A   35C    P0             27W /   70W |    2153MiB /  16384MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI              PID   Type   Process name                        GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A           96586      C   python                                 2150MiB |
+-----------------------------------------------------------------------------------------+
```

`model-a` uses 2153 MiB of 16384 MiB. More than 14 GiB of GPU memory is free.

## Step 5: Deploy the Second Model

Deploy `model-b`, identical to `model-a` except for its name. Save it as `model-b.yaml`:

```yaml title="model-b.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: model-b
spec:
  restartPolicy: Never
  containers:
    - name: model
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command:
        - python
        - -c
        - |
          import time, torch
          weights = torch.empty(2 * 1024**3, dtype=torch.uint8, device="cuda")
          print("model-b loaded 2 GiB of weights on", torch.cuda.get_device_name(0), flush=True)
          time.sleep(365 * 24 * 3600)
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f model-b.yaml
```

```plaintext
pod/model-b created
```

```bash
kubectl get pods
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
model-a   1/1     Running   0          6m39s
model-b   0/1     Pending   0          8s
```

```bash
kubectl get events --field-selector involvedObject.name=model-b
```

```plaintext
LAST SEEN   TYPE      REASON             OBJECT        MESSAGE
9s          Warning   FailedScheduling   pod/model-b   0/1 nodes are available: 1 Insufficient nvidia.com/gpu. no new claims to deallocate, preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
```

The same `Insufficient nvidia.com/gpu` as before, although the card has more than 14 GiB free. The node's allocation shows why:

```bash
kubectl describe node <gpu-node-name> | grep -A 9 "Allocated resources"
```

```plaintext
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests    Limits
  --------           --------    ------
  cpu                850m (10%)  0 (0%)
  memory             240Mi (0%)  340Mi (1%)
  ephemeral-storage  0 (0%)      0 (0%)
  hugepages-1Gi      0 (0%)      0 (0%)
  hugepages-2Mi      0 (0%)      0 (0%)
  nvidia.com/gpu     1           1
```

The node has one `nvidia.com/gpu` and `model-a` holds it. To the scheduler, the GPU is taken. It has no information about the 14 GiB that `model-a` does not use.

## Step 6: Try to Request Half a GPU

A 2 GiB model does not need a whole T4. Try asking for half of one. Save the manifest as `model-half.yaml`:

```yaml title="model-half.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: model-half
spec:
  containers:
    - name: model
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command: ["sleep", "infinity"]
      resources:
        limits:
          nvidia.com/gpu: 0.5
```

```bash
kubectl apply -f model-half.yaml
```

```plaintext
The Pod "model-half" is invalid:
* spec.containers[0].resources.limits[nvidia.com/gpu]: Invalid value: "500m": must be an integer
* spec.containers[0].resources.requests[nvidia.com/gpu]: Invalid value: "500m": must be an integer
```

The API server rejects the Pod before it reaches the scheduler. Extended resources such as `nvidia.com/gpu` must be whole numbers. Each unit stands for one device in the plugin's list, so a fraction has no meaning.

## Verify

| Claim | Evidence |
| --- | --- |
| Without a device plugin, Kubernetes cannot schedule GPU Pods | See the Problem First: `model-a` Pending with `Insufficient nvidia.com/gpu` |
| The device plugin registers the GPU with the kubelet | Step 3: registration logs, `nvidia-gpu.sock`, capacity `nvidia.com/gpu: 1` |
| The Pod gets the GPU through an environment variable | Step 4: `NVIDIA_VISIBLE_DEVICES` holds the GPU UUID from Chapter 1 |
| One Pod takes the whole card regardless of memory use | Step 4 and Step 5: `model-a` uses 2153 MiB of 16384 MiB, `model-b` is Pending |
| GPUs cannot be requested in fractions | Step 6: `nvidia.com/gpu: 0.5` is rejected with `must be an integer` |

## Common Pitfalls

**The device plugin DaemonSet has `DESIRED 0` and no Pod.** The node is missing the label the chart selects on. Check `kubectl get ds -n nvidia-device-plugin` and add the `nvidia.com/gpu.present=true` label from Step 2.

**The device plugin Pod fails and its logs say NVML cannot be loaded.** The container did not get the driver libraries. Go back to Chapter 1, Step 4.1, and check that `nvidia` is containerd's default runtime.

**A GPU Pod stays `Pending` with `Insufficient nvidia.com/gpu`.** Either the node reports no GPU (check the capacity in Step 3) or every GPU is already allocated (check `Allocated resources` in Step 5).

## Checkpoint

<details>
<summary>1. `model-a` uses about 2 GiB of a 16 GiB card. Why does `model-b` stay `Pending`?</summary>

The scheduler counts devices. The node has one `nvidia.com/gpu`, and `model-a` holds it. GPU memory usage is not part of the scheduling decision.

</details>

<details>
<summary>2. Which component tells Kubernetes that the node has a GPU, and how?</summary>

The device plugin. It registers `nvidia.com/gpu` with the kubelet through `kubelet.sock` and reports one device per GPU through ListAndWatch. The kubelet publishes the count as node capacity.

</details>

<details>
<summary>3. How does the container end up with the right GPU?</summary>

At Allocate, the device plugin returns `NVIDIA_VISIBLE_DEVICES` set to the GPU's UUID. The NVIDIA container runtime reads that variable and injects that GPU's device nodes and libraries.

</details>

<details>
<summary>4. Why is `nvidia.com/gpu: 0.5` rejected?</summary>

Extended resources must be whole numbers. Each unit of `nvidia.com/gpu` stands for one device the plugin reported, so half a unit has no meaning.

</details>

## Hand-off

Delete the two model Pods:

```bash
kubectl delete pod model-a model-b
```

```plaintext
pod "model-a" deleted from default namespace
pod "model-b" deleted from default namespace
```

Chapter 3 continues on this node. It expects:

- The NVIDIA device plugin v0.20.1 installed as the Helm release `nvdp` in the `nvidia-device-plugin` namespace
- The GPU node labeled `nvidia.com/gpu.present=true`, with capacity `nvidia.com/gpu: 1`
- No GPU Pods running

## Further Reading

- [Device Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/): the Kubernetes device plugin framework
- [NVIDIA device plugin for Kubernetes](https://github.com/NVIDIA/k8s-device-plugin): configuration options for the plugin used in this chapter
- [GPU Virtualization Principles](/docs/core-concepts/gpu-virtualization): the full device plugin registration and allocation flow, and how HAMi works around the whole-number limit
- [GPU Software Stack Overview](/docs/core-concepts/gpu-stack): the Kubernetes GPU scheduling chain
