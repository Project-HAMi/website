---
title: Install HAMi on Huawei Cloud Cloud Container Engine
sidebar_label: HAMi on CCE
---

This guide covers the CCE-specific configuration for installing HAMi on NVIDIA GPU nodes in [Huawei Cloud Cloud Container Engine (CCE)](https://www.huaweicloud.com/intl/en-us/product/cce.html). For everything else, follow [Prerequisites](./prerequisites.md) and [Online Installation from Helm](./online-installation.md).

## Prepare the GPU node pool

Install the [CCE AI Suite (NVIDIA GPU)](https://support.huaweicloud.com/intl/en-us/usermanual-cce/cce_10_0141.html) add-on before creating the GPU node pool, and keep its default driver. GPU Operator is not required. Keep GPU virtualization disabled.

The CCE AI Suite installs the NVIDIA driver and NVIDIA Container Toolkit on each GPU node, with the driver under `/usr/local/nvidia`. It also adds an `nvidia` runtime to containerd, but the default runtime stays `runc`. HAMi therefore needs a RuntimeClass that points to the `nvidia` runtime. To confirm, run on the GPU node:

```bash
grep default_runtime_name /etc/containerd/config.toml
grep -A1 'runtimes.nvidia.options' /etc/containerd/config.toml
```

The output should contain:

```text
      default_runtime_name = 'runc'
          [plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.nvidia.options]
            BinaryName = '/usr/bin/nvidia-container-runtime'
```

The cluster has no RuntimeClass by default. The HAMi chart creates one. See [Prepare the HAMi values](#prepare-the-hami-values).

## Disable CCE's NVIDIA Device Plugin {#disable-cce-device-plugin}

The CCE AI Suite runs its device plugin as the `kube-system/nvidia-gpu-device-plugin` DaemonSet on GPU nodes. It registers `nvidia.com/gpu` through the same kubelet socket as HAMi's Device Plugin, so only one of them can be active on a node. See [Pods see the whole GPU](#pods-see-the-whole-gpu) for what happens when both run.

The CCE AI Suite deploys the device plugin (`nvidia-gpu-device-plugin`) together with the driver installer (`nvidia-driver-installer`), and neither its console settings nor its YAML parameters can turn off the device plugin alone. The DaemonSets of both components select nodes by the `accelerator` label, which CCE adds to GPU nodes, so removing that label would also stop the driver installer. Add a rule to the device plugin DaemonSet that skips nodes labeled `gpu=on`:

```bash
kubectl -n kube-system patch ds nvidia-gpu-device-plugin --type=json -p='[{"op":"add","path":"/spec/template/spec/affinity/nodeAffinity/requiredDuringSchedulingIgnoredDuringExecution/nodeSelectorTerms/0/matchExpressions/-","value":{"key":"gpu","operator":"NotIn","values":["on"]}}]'
```

Then label the GPU nodes. The same label also selects the nodes for HAMi's Device Plugin:

```bash
kubectl label node <node-name> gpu=on
```

To label every node in the node pool, including nodes added later, add the Kubernetes label `gpu=on` in the node pool settings in the CCE console.

Verify the labels and confirm that the device plugin no longer runs on the node, while the driver installer keeps running:

```bash
kubectl get nodes -L accelerator,gpu
kubectl -n kube-system get ds nvidia-gpu-device-plugin ubuntu22-nvidia-driver-installer
```

```text
NAME          STATUS   ROLES    AGE   VERSION                ACCELERATOR   GPU
192.168.0.3   Ready    <none>   60m   v1.36.2-r10-36.0.2.3   nvidia-t4     on

NAME                               DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
nvidia-gpu-device-plugin           0         0         0       0            0           <none>          65m
ubuntu22-nvidia-driver-installer   1         1         1       1            1           <none>          65m
```

The name of the driver installer DaemonSet depends on the node operating system.

## Copy the HAMi images to SWR {#copy-the-hami-images}

The HAMi chart pulls images from Docker Hub and `registry.cn-hangzhou.aliyuncs.com`, which nodes without public network access cannot reach. Copy the three images to SoftWare Repository for Container (SWR) in the same region as the cluster.

First [create an organization](https://support.huaweicloud.com/intl/en-us/usermanual-swr/swr_01_0014.html). Then, on a machine that can reach Docker Hub and `registry.k8s.io`, generate a login command in the SWR console as described in [Pushing an Image](https://support.huaweicloud.com/intl/en-us/usermanual-swr/swr_01_0011.html), and run it with `skopeo login` in place of `docker login`.

The chart sets the `kube-scheduler` image tag to the Kubernetes version of the cluster. For example, if `kubectl version` shows a server version of `v1.36.2-r0-36.0.13.6`, the tag is `v1.36.2`.

Copy the images, replacing `<region>` with the region ID, for example `cn-southwest-2`, and `v1.36.2` with the tag of your cluster. `--all` copies the image for every platform:

```bash
skopeo copy --all docker://docker.io/projecthami/hami:v2.10.0 \
  docker://swr.<region>.myhuaweicloud.com/<organization>/hami:v2.10.0
skopeo copy --all docker://docker.io/liangjw/kube-webhook-certgen:v1.1.1 \
  docker://swr.<region>.myhuaweicloud.com/<organization>/kube-webhook-certgen:v1.1.1
skopeo copy --all docker://registry.k8s.io/kube-scheduler:v1.36.2 \
  docker://swr.<region>.myhuaweicloud.com/<organization>/kube-scheduler:v1.36.2
```

## Prepare the HAMi values {#prepare-the-hami-values}

Save the following as `hami-cce-values.yaml`, replacing `<region>` and `<organization>`:

```yaml
global:
  imagePullSecrets:
    - default-secret
scheduler:
  kubeScheduler:
    image:
      registry: swr.<region>.myhuaweicloud.com
      repository: <organization>/kube-scheduler
  extender:
    image:
      registry: swr.<region>.myhuaweicloud.com
      repository: <organization>/hami
  patch:
    imageNew:
      registry: swr.<region>.myhuaweicloud.com
      repository: <organization>/kube-webhook-certgen
devicePlugin:
  runtimeClassName: nvidia
  createRuntimeClass: true
  image:
    registry: swr.<region>.myhuaweicloud.com
    repository: <organization>/hami
  monitor:
    image:
      registry: swr.<region>.myhuaweicloud.com
      repository: <organization>/hami
```

`global.imagePullSecrets` uses `default-secret`, which CCE creates in every namespace with the credentials for pulling images from SWR, so the repositories can stay private. See [Cluster Secrets](https://support.huaweicloud.com/intl/en-us/usermanual-cce/cce_10_0388.html). `devicePlugin.runtimeClassName` and `devicePlugin.createRuntimeClass` create the `nvidia` RuntimeClass and use it for HAMi's Device Plugin. HAMi also sets it on the Pods that request vGPU resources.

## Install HAMi

Follow [Online Installation from Helm](./online-installation.md) and add the values file to the installation command:

```bash
helm install hami hami-charts/hami -n kube-system --version 2.10.0 -f hami-cce-values.yaml
```

After `hami-device-plugin` and `hami-scheduler` are running, confirm that the RuntimeClass exists and that the HAMi scheduler holds its leader lease:

```bash
kubectl get runtimeclass
kubectl -n kube-system get lease hami-scheduler
```

```text
NAME     HANDLER   AGE
nvidia   nvidia    29s

NAME             HOLDER                                                                 AGE
hami-scheduler   hami-scheduler-57478c9db5-ttlrj_845424a5-33aa-4881-a744-9baa9090c26c   26s
```

Then confirm that HAMi registered the GPU. With the default `devicePlugin.deviceSplitCount` of 10, a single GPU is reported as 10 `nvidia.com/gpu` resources:

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

```text
10
```

## Troubleshooting

### Pods see the whole GPU {#pods-see-the-whole-gpu}

If CCE's Device Plugin runs on a node alongside HAMi, the last Device Plugin to register takes over `nvidia.com/gpu`. When CCE's Device Plugin wins, the node's `nvidia.com/gpu` allocatable drops from the HAMi value (for example, `10`) to the physical GPU count. New Pods start without errors, but HAMi's limits no longer apply.

To recover:

1. Add the rule from [Disable CCE's NVIDIA Device Plugin](#disable-cce-device-plugin) to the DaemonSet again, and wait for the `nvidia-gpu-device-plugin` Pod on the node to be deleted.
2. Restart HAMi's Device Plugin so it registers again:

   ```bash
   kubectl -n kube-system rollout restart ds/hami-device-plugin
   kubectl -n kube-system rollout status ds/hami-device-plugin
   ```

3. Confirm that the node's `nvidia.com/gpu` allocatable is back to the HAMi value.
4. Recreate the Pods that started while CCE's Device Plugin was active.

### HAMi's Device Plugin keeps restarting

If `hami-device-plugin` is in `CrashLoopBackOff` and its `device-plugin` container logs the following error, the RuntimeClass is not set:

```text
E1011 04:44:38.399747   44144 factory.go:135] Incompatible strategy detected auto
E1011 04:44:38.399767   44144 factory.go:136] If this is a GPU node, did you configure the NVIDIA Container Toolkit?
```

The container runs with the default `runc` runtime and cannot find the NVIDIA driver. Set `devicePlugin.runtimeClassName` and `devicePlugin.createRuntimeClass` as described in [Prepare the HAMi values](#prepare-the-hami-values).

### NUMA error in Device Plugin logs

On a `g6.xlarge.4` instance, which has a single NUMA node, `hami-device-plugin` logs the following error every registration cycle:

```text
E1011 05:13:54.908058   55835 register.go:168] "failed to get numa information from sysfs" idx=0
I1011 05:13:54.908089   55835 register.go:204] Registered device id=0, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
```

HAMi reads the GPU's NUMA node from `/sys/bus/pci/devices/<bus-id>/numa_node`. On this instance, the kernel reports `-1` for the GPU. HAMi cannot determine the NUMA node, logs the error, and falls back to `numa=0`, which matches the actual topology. The device still registers with `health=true`, and GPU workloads run normally. You can ignore this error on single-NUMA instances.
