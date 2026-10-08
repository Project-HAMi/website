---
title: Install HAMi on Tencent Kubernetes Engine
sidebar_label: HAMi on TKE
---

This guide covers the TKE-specific configuration for installing HAMi on NVIDIA GPU nodes in [Tencent Kubernetes Engine (TKE)](https://cloud.tencent.com/product/tke). For everything else, follow [Prerequisites](./prerequisites.md) and [Online Installation from Helm](./online-installation.md).

The steps were verified in the following environment:

| Component         | Version                                         |
| ----------------- | ----------------------------------------------- |
| Node type         | TKE native node (`GN7.2XLARGE32`, 1 × Tesla T4) |
| Operating system  | TencentOS Server 3.1                            |
| Kubernetes        | `v1.34.1-tke.8`                                 |
| Container runtime | containerd `1.6.9-tke.9`                        |
| NVIDIA driver     | `580.126.20`, CUDA `13.0.2`, installed by TKE   |
| HAMi              | `2.10.0`                                        |

## Prepare the GPU node pool

When creating the node pool, select a GPU instance type and a GPU driver version. TKE installs the NVIDIA driver and NVIDIA Container Toolkit on the node, so GPU Operator is not required. Keep **qGPU sharing** disabled; this guide was verified without it.

TKE also sets `nvidia-container-runtime` as the binary of containerd's default `runc` runtime. Every container therefore uses the NVIDIA runtime, and HAMi does not need a RuntimeClass. To confirm, run on the GPU node:

```bash
grep -A1 'runtimes.runc.options' /etc/containerd/config.toml
```

The output should contain:

```text
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = "nvidia-container-runtime"
```

Because TKE installs the driver directly on the host, with `nvidia-smi` in `/usr/bin` and the libraries in `/usr/lib64`, set HAMi's `devicePlugin.nvidiaDriverRoot` to `/`. See [Prepare the HAMi values](#prepare-the-hami-values).

## Disable TKE's NVIDIA Device Plugin {#disable-tke-device-plugin}

TKE deploys its own NVIDIA Device Plugin as the `kube-system/nvidia-device-plugin-daemonset` DaemonSet. It runs on nodes labeled `nvidia-device-enable=enable`, a label TKE adds to GPU nodes. It registers `nvidia.com/gpu` through the same kubelet socket as HAMi, so only one of them can be active on a node. See [Pods see the whole GPU](#pods-see-the-whole-gpu) for what happens when both run.

In the TKE console, edit the GPU node pool and set the following **Labels**:

| Key                    | Value     | Purpose                                   |
| ---------------------- | --------- | ----------------------------------------- |
| `nvidia-device-enable` | `disable` | Stops TKE's Device Plugin on the node     |
| `gpu`                  | `on`      | Selects the node for HAMi's Device Plugin |

Select **Apply this Label/Annotation/Taint update to existing nodes** so that nodes already in the pool are updated.

Alternatively, label an individual node with `kubectl`:

```bash
kubectl label node <node-name> nvidia-device-enable=disable gpu=on --overwrite
```

Verify the labels and confirm that TKE's DaemonSet no longer schedules Pods on the node:

```bash
kubectl get nodes -L gpu,nvidia-device-enable
kubectl -n kube-system get ds nvidia-device-plugin-daemonset
```

```text
NAME          STATUS   ROLES    AGE   VERSION         GPU   NVIDIA-DEVICE-ENABLE
10.100.0.13   Ready    <none>   59m   v1.34.1-tke.8   on    disable

NAME                             DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                 AGE
nvidia-device-plugin-daemonset   0         0         0       0            0           nvidia-device-enable=enable   66m
```

## Prepare the HAMi values {#prepare-the-hami-values}

TKE nodes have no public IP by default, so unless the VPC provides a NAT gateway they can pull images only from Tencent Cloud internal endpoints. The `docker.io/projecthami/hami` image still pulls normally, because TKE configures `mirror.ccs.tencentyun.com` as the containerd mirror for `docker.io`. The chart's default `kube-scheduler` image, however, comes from `registry.cn-hangzhou.aliyuncs.com`, which such nodes cannot reach, so the `hami-scheduler` Pod fails with an error similar to:

```text
Failed to pull image "registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.34.1": ... dial tcp 120.55.105.209:443: i/o timeout
```

Use TKE's `ccr.ccs.tencentyun.com/tkeimages/hyperkube` image instead. It contains the `kube-scheduler` binary, and its tags match TKE's Kubernetes versions. Find the version in the `VERSION` column:

```bash
kubectl get nodes
```

Save the following as `hami-tke-values.yaml`, replacing the tag with your cluster version:

```yaml
scheduler:
  kubeScheduler:
    image:
      registry: ccr.ccs.tencentyun.com
      repository: tkeimages/hyperkube
      tag: v1.34.1-tke.8
devicePlugin:
  nvidiaDriverRoot: /
```

## Install HAMi

Follow [Online Installation from Helm](./online-installation.md) and add the values file to the installation command:

```bash
helm install hami hami-charts/hami -n kube-system -f hami-tke-values.yaml
```

After `hami-device-plugin` and `hami-scheduler` are running, confirm that HAMi registered the GPU. With the default `devicePlugin.deviceSplitCount` of 10, a single T4 is reported as 10 `nvidia.com/gpu` resources:

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

```text
10
```

## Troubleshooting

### Pods see the whole GPU {#pods-see-the-whole-gpu}

If TKE's Device Plugin runs on a node alongside HAMi, the last plugin to register takes over `nvidia.com/gpu`. When TKE's plugin wins, the node's `nvidia.com/gpu` allocatable drops from the HAMi value (for example, `10`) to the physical GPU count. New Pods start without errors, but HAMi's limits no longer apply.

To recover:

1. Set `nvidia-device-enable=disable` on the node as described in [Disable TKE's NVIDIA Device Plugin](#disable-tke-device-plugin), and wait for the `nvidia-device-plugin-daemonset` Pod on that node to be deleted.
2. Restart HAMi's Device Plugin so it registers again:

   ```bash
   kubectl -n kube-system rollout restart ds/hami-device-plugin
   kubectl -n kube-system rollout status ds/hami-device-plugin
   ```

3. Confirm that the node's `nvidia.com/gpu` allocatable is back to the HAMi value.
4. Recreate the Pods that started while TKE's plugin was active.

### NUMA error in Device Plugin logs

On the verified T4 instance, `hami-device-plugin` logs the following error every registration cycle:

```text
E0916 16:14:55.021458   83601 register.go:168] "failed to get numa information from sysfs" idx=0
I0916 16:14:55.021480   83601 register.go:204] Registered device id=0, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
```

HAMi reads the GPU's NUMA node from `/sys/bus/pci/devices/<bus-id>/numa_node`. The kernel writes `-1` there when the firmware exposes no proximity domain (ACPI `_PXM`) for the device, which is the normal case on a single-NUMA virtual machine such as this instance type. HAMi cannot determine a node, logs the error, and falls back to `numa=0`. Check the value on the GPU node:

```bash
nvidia-smi --query-gpu=pci.bus_id --format=csv,noheader |
  tr 'A-F' 'a-f' | sed 's/^0000//' |
  while read -r id; do echo "$id $(cat /sys/bus/pci/devices/$id/numa_node)"; done
```

```text
0000:00:08.0 -1
```

The instance has only one NUMA node, `node0`, so the fallback matches the actual topology. The device still registers with `health=true`, and GPU workloads run normally. You can ignore this error on single-NUMA instances.
