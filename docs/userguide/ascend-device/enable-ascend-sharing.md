---
title: Enable Huawei Ascend sharing
---

The Huawei Ascend device plugin provides three NPU slicing modes for HAMi: `template` (hard slicing), `hami-core` (runtime soft slicing), and `enpu`. This guide covers their prerequisites, chart configuration, plugin deployment, and workload examples.

## Prerequisites

- Install the Ascend driver and [ascend-docker-runtime](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime), and register the `ascend` handler in the node's container runtime. The RuntimeClass created below refers to this handler.
- Use HAMi scheduler and Ascend device plugin versions that support the selected mode. This page describes Next; the fields shown here may not yet be available in published charts or images.
- Ensure `npu-smi` is available on the node. The plugin can access `/usr/local/Ascend/driver/tools/npu-smi` and `/usr/local/sbin/npu-smi` by default. Other locations require an additional host path mount.

### template mode

The driver must support virtualization templates for the device model. HAMi selects the smallest template satisfying the memory request. Template names and capacities must match the driver; see [Device templates](./device-template.md).

### hami-core mode

This mode intercepts runtime calls through `libvnpu.so` to control memory and compute. It currently supports ARM platforms and the HAMi scheduler only. It requires Ascend driver 25.5 or later and a plugin image containing a hami-vnpu-core library compatible with the workload's CANN environment.

Enable device sharing on the target node. Replace `<device-id>` with a device ID from `npu-smi info -l`:

```bash
npu-smi set -t device-share -i <device-id> -d 1
npu-smi info -t device-share -i <device-id>
```

### enpu mode {#enpu}

ENPU uses vCANN-RT to control compute and memory quotas. The current HAMi integration supports A2/910B and A3/910C. Prepare software according to the [official vCANN-RT requirements](https://docs.openeuler.org/zh/docs/24.03_LTS_SP3/unifiedbus/unifiedbus/ubs-virt/ubs-virt-enpu/vcann-rt/README.html):

| Hardware | CANN in the workload image | HDK on the node |
| -------- | -------------------------- | --------------- |
| A2/910B  | 8.5.0 or 9.1.0             | 25.5.0 or later |
| A3/910C  | 8.5.0 or 9.1.0             | 26.0.0 or later |

- The plugin image must contain `libvruntime.so`, `enpu-monitor`, and `ld.so.preload` matching the workload's CANN version. The current upstream image build bundles an ARM64 ENPU runtime built against CANN 9.1.0; an AMD64 image tag does not make those runtime assets AMD64-compatible.
- As with hami-vnpu-core, enable `device-share` on the target devices. A3/910C additionally requires independent-DIE mode. After confirming that existing workloads on the node allow this change, run the commands below. A2/910B does not require a DIE policy change.

```bash
npu-smi set -t multi-die-policy -d 1
npu-smi info -t multi-die-policy
```

The query must report `INDEP_POLICY`. The plugin checks this prerequisite without changing the node policy.

Workload images must contain CANN and an executable `/usr/bin/systemd-detect-virt` with its shared-library dependencies. The plugin installs ENPU runtime files under `/usr/local/enpu/vcann-rt` on the node. It refuses startup if existing files differ from its image; restarting does not bypass this check.

This guide deploys ordinary ENPU slicing, which does not require enpu-manager. Memory swapping (mem-swap) additionally requires a runtime and enpu-manager supporting that feature; Pod annotations alone do not enable it.

## Configure Ascend scheduling

These settings belong to the **HAMi chart**. Select one mode configuration, save it as `hami-ascend-values.yaml`, and merge any other values required by your deployment. All modes require `devices.ascend.enabled: true`; this switch does not deploy the Ascend plugin.

### template configuration

```yaml
devices:
  ascend:
    enabled: true
    runtimeClassName: ascend
    hamiVnpuMode: template
```

Keep the default device models and templates in `devices.ascend.configs` when they fit the cluster. To customize them, use the [values source](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml) and preserve the complete list of required models: list overrides replace the entire list. Template mode does not use `deviceSplitCount` to calculate slice capacity.

### hami-core configuration

```yaml
devices:
  ascend:
    enabled: true
    runtimeClassName: ascend
    hamiVnpuMode: hami-core
    deviceSplitCount: 10
```

`deviceSplitCount` limits virtual-device slots per physical NPU and defaults to `10`. Workload Pods still request memory and compute quotas. The plugin image must support this field; setting a chart value does not add functionality to an older image.

### enpu configuration {#enpu-policy}

```yaml
devices:
  ascend:
    enabled: true
    runtimeClassName: ascend
    hamiVnpuMode: enpu
    deviceSplitCount: 10
    enpuPolicy: elastic
```

ENPU also uses `deviceSplitCount`, capped at `100`. Each container can request a share of only one physical DIE. A node's `hamiVnpuMode` and positive `vDeviceCount` override the global mode and count, respectively; see [node configuration](#node-configuration).

`enpuPolicy` defaults to `elastic`. Accepted policies are `fixed-share`, `elastic`, and `best-effort`, with numeric string aliases `"1"`, `"2"`, and `"3"`, respectively. The Pod annotation `huawei.com/enpu-policy` overrides the default. During admission, HAMi writes the selected policy into the Pod annotation; later changes to the global default do not change existing Pods. ENPU Pods sharing a physical DIE must use the same policy, and invalid policies are rejected.

### Install HAMi

Follow [Online installation](../../installation/online-installation.md), passing `--values hami-ascend-values.yaml`. The following steps assume release `hami`; replace `<namespace>` in commands with the actual HAMi namespace. An Ascend-only cluster can additionally set `devicePlugin.enabled: false` to disable the NVIDIA plugin; retain it where needed in a mixed GPU cluster.

When customizing resource names, also update `devices.ascend.customresources` and workload Pods. See the [HAMi chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values) for all fields. For an existing installation, follow [Upgrade](../../installation/upgrade.md).

## Deploy the Ascend device plugin

These steps install a new standalone plugin in the same namespace as HAMi. If an existing Helm release or manifest already manages the plugin, update that deployment instead of creating duplicate DaemonSets.

### Label device nodes

```bash
kubectl label node <ascend-node> ascend=on --overwrite
```

Run this for each node that should run the plugin. `ascend=on` controls plugin placement; the global or per-node configuration selects the slicing mode.

### Prepare the plugin chart and values

Obtain a plugin source version supporting the required mode. Replace `<plugin-ref>` with the corresponding tag or commit:

```bash
git clone https://github.com/Project-HAMi/ascend-device-plugin.git
git -C ascend-device-plugin checkout <plugin-ref>
```

Save the following as `ascend-plugin-values.yaml`. These are **Ascend plugin chart** values and do not belong in the HAMi values file above. Replace `<plugin-image-tag>` with an image tag matching the selected source and mode; also change `image.repository` for a custom image.

```yaml
image:
  repository: projecthami/ascend-device-plugin
  tag: "<plugin-image-tag>"
config:
  create: false
  existingDeviceConfigMapName: hami-scheduler-device
runtimeClass:
  create: true
  name: ascend
  handler: ascend
nodeSelector:
  ascend: "on"
nodeConfig: |
  nodes: []
```

The plugin chart creates RBAC, a ServiceAccount, a DaemonSet, a RuntimeClass, and the node ConfigMap. Set `runtimeClass.create: false` if the `ascend` RuntimeClass already exists. `nodes: []` makes all nodes inherit HAMi's global mode.

:::warning Reuse HAMi's global device configuration

`config.create: false` and `config.existingDeviceConfigMapName` make the plugin reuse HAMi's `hami-scheduler-device` ConfigMap. Do not apply `ascend-device-configmap.yaml` again or manually edit the global `device-config.yaml`. Manage device parameters through HAMi's `devices.ascend.*` values.

For a custom HAMi release name, set `existingDeviceConfigMapName` to the actual generated ConfigMap name. The ConfigMap must be in the plugin's namespace. With this reuse configuration, plugin chart fields used to generate a device ConfigMap, such as `hamiVnpuMode` and `deviceSplitCount`, do not override HAMi's configuration.

:::

### Configure mode and device count per node {#node-configuration}

To use multiple modes in one cluster, replace `nodeConfig` in the plugin values with your actual node entries. For example:

```yaml
nodeConfig: |
  nodes:
    - name: ascend-node-1
      hamiVnpuMode: template
    - name: ascend-node-2
      hamiVnpuMode: hami-core
      vDeviceCount: 8
    - name: ascend-node-3
      hamiVnpuMode: enpu
      vDeviceCount: 8
```

`vDeviceCount` sets the virtual-device limit per physical NPU on a node in `hami-core` and `enpu` modes. A positive value overrides the global `deviceSplitCount`, so both nodes above use a limit of `8`. When omitted or non-positive, the global value applies. ENPU remains capped at `100`; `template` mode uses the template calculation.

The plugin chart writes this to the `node-config.yaml` key in `hami-device-node-config`. Node names must match Kubernetes. This field is a string and is replaced in full, so preserve other node entries. Nodes without a mode inherit the global value. Every ENPU node must meet the ENPU prerequisites; do not mix hami-vnpu-core and ENPU on one physical DIE.

### Install and check the plugin

```bash
helm install hami-ascend ./ascend-device-plugin/charts/ascend-device-plugin \
  --namespace <namespace> \
  --values ascend-plugin-values.yaml
kubectl -n <namespace> rollout status daemonset/hami-ascend-device-plugin
kubectl -n <namespace> get pods -l app.kubernetes.io/component=hami-ascend-device-plugin
kubectl get runtimeclass ascend
kubectl describe node <ascend-node>
```

Confirm that the DaemonSet is ready and the node's `Allocatable` resources include the actual Ascend device model. Then run an example for the selected mode to verify allocation and computation. Pod readiness alone does not demonstrate a working NPU workload.

## Running Huawei Ascend jobs

Examples use scheduler `hami-scheduler` and RuntimeClass `ascend`; adjust these to match the deployment. The PyTorch examples use AscendHub 910B and 310P images containing CANN 9.0.0; the vLLM example uses the official `v0.23.0` image containing CANN 9.1.0. Ensure the image's CANN version is compatible with the node driver and slicing runtime. The vLLM example also requires a PVC containing model files.

### template mode

Run these examples on nodes configured for template mode. A device-count-only request uses a whole device; a memory request selects a hardware template satisfying that request.

#### Ascend 910B3

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: ubuntu-container
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/pytorch:torch_npu-2.10.0-910b-ubuntu-py3.11
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          # if you don't specify Ascend910B3-memory, it will use a whole NPU.
          huawei.com/Ascend910B3-memory: "4096"
```

#### Ascend 310P

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: ubuntu-container
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/pytorch:torch_npu-2.10.0-310p-ubuntu-py3.11
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend310P: "1"
          huawei.com/Ascend310P-memory: "1024"
```

### hami-core mode

#### Single-device memory and compute quotas

Add the annotation `huawei.com/vnpu-mode: 'hami-core'` to enable soft slicing for a Pod. You can also request a percentage of compute cores using the `-core` resource:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-soft-slice-pod
  annotations:
    huawei.com/vnpu-mode: "hami-core"
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: npu_pod
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/pytorch:torch_npu-2.10.0-910b-ubuntu-py3.11
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          huawei.com/Ascend910B3-memory: "28672"
          huawei.com/Ascend910B3-core: "40" # Request 40% of compute cores
```

#### Two-device vLLM inference (TP=2)

Memory and compute requests apply to each device independently. Replace `model-pvc` with a PVC containing the `Qwen3-0.6B` model directory and use a compatible vLLM-Ascend image.

Assume each physical card has 64Gi of memory, and you plan to use 32Gi on each of the 2 cards (totaling 64Gi):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vllm-npu-2card
  annotations:
    huawei.com/vnpu-mode: "hami-core"
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: vllm-container
      image: quay.io/ascend/vllm-ascend:v0.23.0
      command: ["/bin/sh", "-c"]
      args:
        - |
          vllm serve /model/Qwen3-0.6B \
          --host 0.0.0.0 \
          --port 8002 \
          --enforce-eager \
          --tensor-parallel-size 2 \
          --gpu-memory-utilization 0.5
      resources:
        limits:
          huawei.com/Ascend910B3: "2"
          huawei.com/Ascend910B3-memory: "32768"
          huawei.com/Ascend910B3-core: "50"
      volumeMounts:
        - name: model
          mountPath: /model
          readOnly: true
  volumes:
    - name: model
      persistentVolumeClaim:
        claimName: model-pvc
```

:::note

Each device receives `32768` MiB (32 GiB), for 64 GiB across both devices. `--gpu-memory-utilization 0.5` uses the per-device ratio of 32/64; leave memory headroom for runtime overhead.

:::

### enpu mode

#### Single-device compute and memory quotas

This Ascend 910B3 example requests 16 GiB of memory and a 20% compute quota, then performs matrix multiplication. The `elastic` policy can borrow idle compute, so 20% is not a strict compute ceiling.

Replace `image` below with a workload image that meets the [ENPU example prerequisites](https://github.com/Project-HAMi/ascend-device-plugin/blob/ab41bec367ca95ac52ed1bcb8667c33e689f8f37/examples/enpu/README.md#prerequisites-and-deployment): its CANN version must be compatible with the drivers and ENPU runtime, and it must include an executable `/usr/bin/systemd-detect-virt` with its dependencies. This example also requires PyTorch and `torch_npu`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: enpu-soft-slicing
  annotations:
    huawei.com/vnpu-mode: enpu
    huawei.com/enpu-policy: elastic
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  restartPolicy: Never
  containers:
    - name: pytorch
      image: registry.example.com/your-project/pytorch-ascend:replace-me
      command: ["python3", "-u", "-c"]
      args:
        - |
          import torch
          import torch_npu
          torch.npu.set_device(0)
          a = torch.ones((1024, 1024), device="npu:0")
          for _ in range(100):
              result = torch.mm(a, a)
          torch.npu.synchronize()
          print("ENPU result:", result[0, 0].item())
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          huawei.com/Ascend910B3-memory: "16384"
          huawei.com/Ascend910B3-core: "20"
```

Save the manifest as `enpu-soft-slicing.yaml`, replace `<workload-namespace>` with the workload namespace, and run:

```bash
kubectl -n <workload-namespace> apply -f enpu-soft-slicing.yaml
kubectl -n <workload-namespace> logs -f enpu-soft-slicing
```

Successful computation should print `ENPU result: 1024.0`. For 910C, change all three resource names to `Ascend910C`, `Ascend910C-memory`, and `Ascend910C-core`, and first verify independent-DIE mode. Applications use the container-local device `npu:0`; do not override the device visibility set by the plugin.

## Notes

- In template mode, the default 910B3 configuration provides 16 and 32 GiB templates; the example's 4096 MiB request selects a 16 GiB template. Supported templates depend on the model and driver.
- Huawei Ascend-sharing in init containers is not supported.
- The template slicing examples request one device per container. hami-vnpu-core supports multiple devices with per-device memory and compute quotas; ENPU supports only one physical DIE per container.
