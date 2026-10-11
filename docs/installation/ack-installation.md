---
title: Install HAMi on Alibaba Cloud Container Service for Kubernetes
sidebar_label: HAMi on ACK
---

This guide covers the ACK-specific configuration for installing HAMi on NVIDIA GPU nodes in [Alibaba Cloud Container Service for Kubernetes (ACK)](https://www.alibabacloud.com/product/kubernetes). For everything else, follow [Prerequisites](./prerequisites.md) and [Online Installation from Helm](./online-installation.md).

The steps were verified in the following environment:

| Component         | Version                                      |
| ----------------- | -------------------------------------------- |
| Cluster           | ACK managed cluster, China (Hangzhou) region |
| Node type         | `ecs.gn6i-c4g1.xlarge`, 1 × Tesla T4         |
| Operating system  | Ubuntu 24.04.3 LTS                           |
| Kubernetes        | `v1.36.2-aliyun.1`                           |
| Container runtime | containerd `2.3.4`                           |
| NVIDIA driver     | `535.161.07`, CUDA `12.2`, installed by ACK  |
| HAMi              | `2.10.0`                                     |

## Prepare the GPU node pool

When creating the node pool, select a GPU instance type. ACK installs the NVIDIA driver and NVIDIA Container Toolkit on the node, so GPU Operator is not required. This guide was verified without ACK's shared GPU scheduling components.

ACK also sets `nvidia-container-runtime` as the binary of containerd's default `runc` runtime. Every container therefore uses the NVIDIA runtime, and HAMi does not need a RuntimeClass. To confirm, run on the GPU node:

```bash
grep -A1 'runtimes.runc.options' /etc/containerd/config.toml
```

The output should contain:

```text
          [plugins."io.containerd.cri.v1.runtime".containerd.runtimes.runc.options]
            BinaryName = "nvidia-container-runtime"
```

Because ACK installs the driver directly on the host, with `nvidia-smi` in `/usr/bin` and the libraries in `/lib/x86_64-linux-gnu`, set HAMi's `devicePlugin.nvidiaDriverRoot` to `/`. See [Prepare the HAMi values](#prepare-the-hami-values).

## Disable ACK's NVIDIA Device Plugin {#disable-ack-device-plugin}

ACK installs the `ack-nvidia-device-plugin` add-on by default. It runs as the `kube-system/ack-nvidia-device-plugin` DaemonSet on nodes labeled `ack.node.gpu.schedule=default`, a label ACK adds to GPU nodes. It registers `nvidia.com/gpu` through the same kubelet socket as HAMi, so only one of them can be active on a node. See [Pods see the whole GPU](#pods-see-the-whole-gpu) for what happens when both run.

Use one of the following methods.

### Method 1: Label the GPU nodes

This method disables ACK's Device Plugin on the labeled nodes only. Edit the GPU node pool in the ACK console and add the following **Node Labels**:

| Key                     | Value      | Purpose                                   |
| ----------------------- | ---------- | ----------------------------------------- |
| `ack.node.gpu.schedule` | `disabled` | Stops ACK's Device Plugin on the node     |
| `gpu`                   | `on`       | Selects the node for HAMi's Device Plugin |

The `disabled` value is described in ACK's [Schedule GPUs with DRA](https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/schedule-gpus-using-dra) guide.

Alternatively, label an individual node with `kubectl`:

```bash
kubectl label node <node-name> ack.node.gpu.schedule=disabled gpu=on --overwrite
```

Verify the labels and confirm that ACK's DaemonSet no longer schedules Pods on the node:

```bash
kubectl get nodes -L gpu,ack.node.gpu.schedule
kubectl -n kube-system get ds ack-nvidia-device-plugin
```

```text
NAME                      STATUS   ROLES    AGE   VERSION            GPU   ACK.NODE.GPU.SCHEDULE
cn-hangzhou.10.207.93.6   Ready    <none>   51m   v1.36.2-aliyun.1   on    disabled

NAME                       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                   AGE
ack-nvidia-device-plugin   0         0         0       0            0           ack.node.gpu.schedule=default   57m
```

### Method 2: Uninstall the add-on

This method disables ACK's Device Plugin for the whole cluster. Uninstall the `ack-nvidia-device-plugin` add-on on the **Add-ons** page of the cluster in the ACK console. Then label the GPU nodes for HAMi's Device Plugin:

```bash
kubectl label node <node-name> gpu=on
```

## Copy the HAMi images to Container Registry {#copy-the-hami-images}

Nodes in Chinese mainland regions cannot reach Docker Hub. The HAMi chart pulls `docker.io/projecthami/hami` and `docker.io/liangjw/kube-webhook-certgen`, so the `hami-admission-create` Job fails with an error similar to:

```text
Failed to pull image "docker.io/liangjw/kube-webhook-certgen:v1.1.1": ... dial tcp 157.240.17.35:443: i/o timeout
```

The chart's default `kube-scheduler` image comes from `registry.cn-hangzhou.aliyuncs.com` and pulls normally.

Copy the two Docker Hub images to an Alibaba Cloud Container Registry (ACR) instance in the same region as the cluster. Use either edition:

- ACR Enterprise Edition can sync the images from Docker Hub. See [Create an ACR Enterprise Edition instance](https://www.alibabacloud.com/help/en/acr/user-guide/create-a-container-registry-enterprise-edition-instance) and [Subscribe to images from overseas sources](https://www.alibabacloud.com/help/en/acr/user-guide/subscribe-to-image-tags).
- ACR Personal Edition requires you to push the images yourself. See [Push and pull images by using a Personal Edition instance](https://www.alibabacloud.com/help/en/acr/user-guide/use-a-container-registry-personal-edition-instance-to-push-and-pull-images).

Make the `hami` and `kube-webhook-certgen` repositories public so that the nodes can pull them without credentials.

To push the images yourself, log in to the instance's public endpoint from a machine that can reach Docker Hub:

```bash
docker login --username=<username> registry.cn-<personal-instance-region>.aliyuncs.com
```

Copy the images with `docker buildx imagetools create`. It copies the image index with every platform, so the `linux/amd64` image is included even when you run it on an arm64 machine:

```bash
docker buildx imagetools create \
  --tag registry.cn-<personal-instance-region>.aliyuncs.com/<namespace>/hami:v2.10.0 \
  docker.io/projecthami/hami:v2.10.0
docker buildx imagetools create \
  --tag registry.cn-<personal-instance-region>.aliyuncs.com/<namespace>/kube-webhook-certgen:v1.1.1 \
  docker.io/liangjw/kube-webhook-certgen:v1.1.1
```

## Grant the HAMi scheduler access to DRA resources {#grant-dra-access}

The `kube-scheduler` container in the `hami-scheduler` Pod is bound to the built-in `system:kube-scheduler` ClusterRole. On ACK, this ClusterRole has no rules for the `resource.k8s.io` API group. `kube-scheduler` v1.36 watches the DRA resources in that group, so it logs the following error and never starts leader election:

```text
E1010 16:36:37.676013       1 reflector.go:227] "Failed to watch" err="failed to list *v1.ResourceClaim: resourceclaims.resource.k8s.io is forbidden: User \"system:serviceaccount:kube-system:hami-scheduler\" cannot list resource \"resourceclaims\" in API group \"resource.k8s.io\" at the cluster scope"
```

The `hami-scheduler` Pod stays `Running`, but its `vgpu-scheduler-extender` container repeats `Scheduler extender has not become leader yet`, and Pods that request vGPU resources stay `Pending`.

Before installing HAMi, save the following as `hami-scheduler-dra-rbac.yaml`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hami-scheduler-dra
rules:
  - apiGroups: ["resource.k8s.io"]
    resources: ["resourceclaims", "resourceslices", "deviceclasses"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hami-scheduler-dra
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: hami-scheduler-dra
subjects:
  - kind: ServiceAccount
    name: hami-scheduler
    namespace: kube-system
```

Apply it:

```bash
kubectl apply -f hami-scheduler-dra-rbac.yaml
```

The binding refers to the ServiceAccount of a release named `hami`. For another release name, the ServiceAccount is `<release-name>-hami-scheduler`.

## Prepare the HAMi values {#prepare-the-hami-values}

Point the HAMi images to your ACR repositories. Use the instance's VPC endpoint, which the nodes reach without a NAT gateway. Set each image separately, because `global.imageRegistry` also changes the registry of the `kube-scheduler` image.

Save the following as `hami-ack-values.yaml`, replacing `<personal-instance-region>` and `<namespace>`. For Enterprise Edition, set `registry` to the VPC endpoint of the Enterprise Edition instance:

```yaml
scheduler:
  extender:
    image:
      registry: registry-vpc.cn-<personal-instance-region>.aliyuncs.com
      repository: <namespace>/hami
  patch:
    imageNew:
      registry: registry-vpc.cn-<personal-instance-region>.aliyuncs.com
      repository: <namespace>/kube-webhook-certgen
devicePlugin:
  nvidiaDriverRoot: /
  image:
    registry: registry-vpc.cn-<personal-instance-region>.aliyuncs.com
    repository: <namespace>/hami
  monitor:
    image:
      registry: registry-vpc.cn-<personal-instance-region>.aliyuncs.com
      repository: <namespace>/hami
```

## Install HAMi

Follow [Online Installation from Helm](./online-installation.md) and add the values file to the installation command:

```bash
helm install hami hami-charts/hami -n kube-system -f hami-ack-values.yaml
```

After `hami-device-plugin` and `hami-scheduler` are running, confirm that the HAMi scheduler holds its leader lease:

```bash
kubectl -n kube-system get lease hami-scheduler
```

```text
NAME             HOLDER                                                                 AGE
hami-scheduler   hami-scheduler-566cc89c9d-68f6n_8ed04e0d-8e3d-457a-a866-76fc43de07f5   38s
```

Then confirm that HAMi registered the GPU. With the default `devicePlugin.deviceSplitCount` of 10, a single T4 is reported as 10 `nvidia.com/gpu` resources:

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

```text
10
```

## Troubleshooting

### Pods see the whole GPU {#pods-see-the-whole-gpu}

If ACK's Device Plugin runs on a node alongside HAMi, the last plugin to register takes over `nvidia.com/gpu`. When ACK's plugin wins, the node's `nvidia.com/gpu` allocatable drops from the HAMi value (for example, `10`) to the physical GPU count. New Pods start without errors, but HAMi's limits no longer apply.

To recover:

1. Disable ACK's Device Plugin on the node as described in [Disable ACK's NVIDIA Device Plugin](#disable-ack-device-plugin), and wait for the `ack-nvidia-device-plugin` Pod on that node to be deleted.
2. Restart HAMi's Device Plugin so it registers again:

   ```bash
   kubectl -n kube-system rollout restart ds/hami-device-plugin
   kubectl -n kube-system rollout status ds/hami-device-plugin
   ```

3. Confirm that the node's `nvidia.com/gpu` allocatable is back to the HAMi value.
4. Recreate the Pods that started while ACK's plugin was active.

### NUMA error in Device Plugin logs

On the verified T4 instance, `hami-device-plugin` logs the following error every registration cycle:

```text
E1010 16:47:54.742604   36382 register.go:168] "failed to get numa information from sysfs" idx=0
I1010 16:47:54.742629   36382 register.go:204] Registered device id=0, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
```

HAMi reads the GPU's NUMA node from `/sys/bus/pci/devices/<bus-id>/numa_node`. On this single-NUMA virtual machine, the kernel reports `-1` for every PCI device, including the GPU. HAMi cannot determine a node, logs the error, and falls back to `numa=0`, which matches the actual topology. The device still registers with `health=true`, and GPU workloads run normally. You can ignore this error on single-NUMA instances.
