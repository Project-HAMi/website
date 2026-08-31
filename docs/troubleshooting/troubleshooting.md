---
title: Troubleshooting
---

## GPU Memory Limit Not Enforced {#gpu-memory-limit-not-enforced}

If a container exceeds its `nvidia.com/gpumem` limit, check the following causes:

- **`CUDA_DISABLE_CONTROL=true` is set** - disables HAMi-core enforcement entirely. Remove it from production workloads.
- **Docker-in-Docker (DinD)** - inner containers do not inherit the `/etc/ld.so.preload` hostPath mount. HAMi enforcement does not apply inside DinD.
- **Direct driver API usage** - workloads calling NVML or the CUDA Driver API directly bypass `libvgpu.so`.
- **`nvidia-container-runtime` not set as default** - verify with:

  ```bash
  containerd config dump | grep default_runtime_name
  ```

  The output must show `nvidia`. If not, follow the [Prerequisites](./installation/online-installation) guide.

- If you don’t explicitly request vGPUs when using the device plugin with NVIDIA images, all GPUs on the host may be exposed to your container.
- Currently, A100 MIG can be supported in only "none" and "mixed" modes.
- Tasks with the "nodeName" field cannot be scheduled at the moment; please use "nodeSelector" instead.
- Only computing tasks are currently supported; video codec processing is not supported.
- Since v2.3.10, HAMi has changed the `device-plugin` environment variable name from `NodeName` to `NODE_NAME`. If you are using an image version earlier than v2.3.10, the `device-plugin` may fail to start.

  To resolve this issue, you have two options:

  - Manually edit the DaemonSet using `kubectl edit daemonset` and update the environment variable from `NodeName` to `NODE_NAME`.
  - Upgrade the `device-plugin` image to the latest version using Helm:

    ```bash
    helm upgrade hami hami/hami -n kube-system
    ```

    This will apply the fix automatically.

## NVIDIA containers fail with GPU Operator 25.10+ {#nvidia-toolkit-gpu-operator-25-10}

Use this section when the HAMi Device Plugin or a HAMi-scheduled NVIDIA workload stops starting after GPU Operator is installed or upgraded.

### Problem 1: The HAMi Device Plugin fails to start

#### Identify the cause

Check the Device Plugin logs:

```bash
kubectl logs -n kube-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  --all-containers --tail=200
```

Match the output to one of these errors:

| Error in the log | Cause |
| --- | --- |
| `Incompatible strategy detected auto` | The Device Plugin cannot discover NVML devices because its container did not receive the NVIDIA driver and devices. |
| `invalid device discovery strategy` | The Device Plugin could not initialize NVIDIA device discovery, usually for the same runtime-injection reason. |
| `failed to locate libcuda.so` or `failed to locate libnvidia-ml.so` | HAMi cannot find the driver libraries under the configured driver root while generating a CDI specification. |

Confirm the runtime and CDI configuration:

```bash
kubectl get clusterpolicy -o yaml | grep -A 5 'cdi:'
kubectl get runtimeclass nvidia

kubectl get pods -n kube-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  -o custom-columns=NAME:.metadata.name,RUNTIMECLASS:.spec.runtimeClassName
```

With GPU Operator 25.10+, CDI is normally enabled, the `nvidia` RuntimeClass must exist, and the HAMi Device Plugin must show `nvidia` in the `RUNTIMECLASS` column.

#### Solution

Configure the `nvidia` RuntimeClass for HAMi and restart the Device Plugin:

```bash
helm upgrade hami hami-charts/hami \
  --namespace kube-system \
  --reuse-values \
  --set devicePlugin.runtimeClassName=nvidia

kubectl rollout restart daemonset/hami-device-plugin -n kube-system
kubectl rollout status daemonset/hami-device-plugin -n kube-system
```

If the logs report missing driver libraries while HAMi CDI is enabled, use the GPU Operator paths:

```yaml
devicePlugin:
  runtimeClassName: nvidia
  deviceListStrategy: cdi-annotations
  nvidiaDriverRoot: /run/nvidia/driver
  nvidiaHookPath: /usr/local/nvidia/toolkit/nvidia-ctk
```

Wait until the NVIDIA driver and Toolkit DaemonSets are ready, then restart the HAMi Device Plugin. For host-installed drivers, set `devicePlugin.nvidiaDriverRoot` to `/` instead.

### Problem 2: A HAMi-scheduled Pod fails to start

#### Identify the cause

Inspect the Pod events and its assigned RuntimeClass:

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get pod <pod-name> -n <namespace> \
  -o custom-columns=NAME:.metadata.name,RUNTIMECLASS:.spec.runtimeClassName
```

Use the error text to select the correct path:

| Error in the Pod events | Cause |
| --- | --- |
| `libcuda.so.1: cannot open shared object file` | The container started without the NVIDIA driver libraries. |
| `unresolvable CDI devices management.nvidia.com/gpu=GPU-...` | The NVIDIA runtime selected a GPU management CDI device, but the corresponding device could not be generated or resolved. |
| `unresolvable CDI devices k8s.device-plugin.nvidia.com/gpu=GPU-...` | HAMi returned a CDI device, but the runtime cannot find a matching HAMi-generated CDI specification. |

#### Solution

First determine which HAMi injection mode is configured:

```bash
helm get values hami -n kube-system | grep -A 5 'devicePlugin:'
```

- For the default `devicePlugin.deviceListStrategy=envvar` mode, set `devicePlugin.runtimeClassName=nvidia` by using the Helm command from Problem 1. This makes the NVIDIA runtime process the UUID returned through `NVIDIA_VISIBLE_DEVICES`.
- For `devicePlugin.deviceListStrategy=cdi-annotations`, apply all four CDI values shown in Problem 1. Then inspect `/var/run/cdi/k8s.device-plugin.nvidia.com-gpu.json` on the node and verify that it contains the allocated GPU UUID.
- For a host-installed Container Toolkit, confirm that the `nvidia` runtime is present in the active container runtime configuration. Restart the container runtime after correcting its configuration.

Do not mix HAMi CDI annotations with a missing or stale HAMi CDI specification. See [NVIDIA CDI support](../installation/configure-cdi.md) for the complete setup and verification procedure.

### Why this happens

Starting with [GPU Operator 25.10.0](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/cdi.html), CDI is enabled by default and the Operator no longer makes the `nvidia` runtime the default runtime.

Before 25.10.0, GPU Operator normally configured the NVIDIA runtime as the default. As a result, the NVIDIA runtime hook processed every Pod and injected the devices and driver libraries selected through `NVIDIA_VISIBLE_DEVICES`.

With 25.10.0 and later, `runc` remains the default runtime and the container runtime uses native CDI for standard Device Plugin workloads. GPU management containers that access GPUs through `NVIDIA_VISIBLE_DEVICES`, including the HAMi Device Plugin, must explicitly use `runtimeClassName: nvidia`.

HAMi supports two device-injection paths:

| HAMi mode | Allocation result | Runtime requirement |
| --- | --- | --- |
| `envvar` (default) | HAMi writes the allocated GPU UUID to `NVIDIA_VISIBLE_DEVICES`. | On GPU Operator 25.10+, the Pod must use the `nvidia` RuntimeClass. |
| `cdi-annotations` | HAMi returns a CDI device named `k8s.device-plugin.nvidia.com/gpu=GPU-...` and generates its CDI specification on the node. | The container runtime must have CDI enabled and be able to read the current HAMi specification. |

The HAMi chart applies `devicePlugin.runtimeClassName` both to the Device Plugin and to NVIDIA workloads mutated by the HAMi scheduler. This is why setting it to `nvidia` fixes the management container and keeps the workload runtime path consistent.

For new clusters, GPU Operator is recommended because it provides one entry point for configuring and upgrading the driver, Container Toolkit, and monitoring components. If these components are already installed on the hosts and you maintain their runtime configuration yourself, GPU Operator is optional; follow [Prerequisites](../installation/prerequisites.md).

:::warning

Disable the GPU Operator Device Plugin when using HAMi. Both plugins advertise `nvidia.com/gpu` and must not run on the same nodes.

```yaml
devicePlugin:
  enabled: false
```

:::
