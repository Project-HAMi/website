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


## GPU Pod Scheduling Failure with Simulated GPUs

When using simulated GPUs with HAMi, a GPU workload can remain `Pending` even though Kubernetes advertises the simulated GPU resources.

### Symptom

A GPU workload remains unscheduled:

```bash
kubectl get pod hami-gpu-test -o wide
```

Output:
```
NAME            READY   STATUS    RESTARTS   AGE
hami-gpu-test   0/1     Pending   0          5m
```

The pod events may show:

```
Warning  FailedScheduling  ...  node ... has been locked within 5m0s
```


HAMi scheduler logs may also report:

```
failed to decode node devices
```

### Cause

HAMi needs the GPU device information on the node in its expected JSON format.

In this simulated-GPU setup, the node annotation contained a colon-delimited device string:

```
GPU-MOCK-0,0,11441,100,NVIDIA-Tesla-K80,0,true:GPU-MOCK-1,1,11441,100,NVIDIA-Tesla-K80,0,true:
```

HAMi expected JSON and therefore failed to decode the node device information:

```
failed to decode node devices
err="invalid character 'G' looking for beginning of value"
```

### Solution

Register the simulated NVIDIA devices on the node using the HAMi node registration annotation.

Apply the annotation with proper JSON format:

```bash
kubectl annotate node kcna-cluster-worker \
  'hami.io/node-nvidia-register=[{"id":"GPU-MOCK-0","count":1,"devmem":11441,"devcore":100,"type":"NVIDIA-Tesla-K80","health":true,"numa":0,"mode":"hami-core"},{"id":"GPU-MOCK-1","count":1,"devmem":11441,"devcore":100,"type":"NVIDIA-Tesla-K80","health":true,"numa":0,"mode":"hami-core"}]' \
  --overwrite
```

Verify the annotation:

```bash
kubectl get node kcna-cluster-worker \
  -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}'
echo
```

The output should contain a valid JSON array similar to:

```json
[{"id":"GPU-MOCK-0","count":1,"devmem":11441,"devcore":100,"type":"NVIDIA-Tesla-K80","health":true,"numa":0,"mode":"hami-core"},{"id":"GPU-MOCK-1","count":1,"devmem":11441,"devcore":100,"type":"NVIDIA-Tesla-K80","health":true,"numa":0,"mode":"hami-core"}]
```

Then delete and recreate the affected pod so HAMi can attempt scheduling again:

```bash
kubectl delete pod hami-gpu-test
```

Recreate the workload using the GPU resource request appropriate for the test environment.

### Verification

Check the pod:

```bash
kubectl get pod hami-gpu-test -o wide
```

A successful result should show the pod running on the registered node:

```
NAME            READY   STATUS    RESTARTS   AGE
hami-gpu-test   1/1     Running   0          11s
```

Check the scheduling events:

```bash
kubectl describe pod hami-gpu-test | grep -A10 "Events:"
```

Successful scheduling should include messages similar to:

```
Normal  FilteringSucceed  ...  find fit node(kcna-cluster-worker)
Normal  BindingSucceed    ...  Successfully binding node [kcna-cluster-worker]
Normal  Scheduled         ...  Successfully assigned default/hami-gpu-test to kcna-cluster-worker
```

### Troubleshooting

If the pod remains `Pending`,verify that Kubernetes advertises the simulated GPU resources:

```bash
kubectl get node kcna-cluster-worker \
  -o jsonpath='{.status.capacity.nvidia\.com/gpu}'
echo
```


Check the HAMi GPU registration annotation:
```bash
kubectl get node kcna-cluster-worker \
  -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}'
echo
```

Check the HAMi scheduler logs:
```bash
kubectl logs -n kube-system \
  -l app.kubernetes.io/component=hami-scheduler \
  --tail=200
```

Look specifically for:

```
failed to decode node devices
```

If this error appears, inspect the `hami.io/node-nvidia-register` annotation and make sure it contains valid JSON.

### Environment Tested

* Kubernetes v1.36.1
* HAMi v2.9.0
* Kind
* Simulated GPUs
* Two simulated NVIDIA devices on the worker node
* Node: `kcna-cluster-worker`