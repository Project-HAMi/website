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

## HAMi device plugin fails on a GPU-less node

HAMi's standard installation expects supported accelerator hardware and the corresponding vendor runtime to be available on nodes where the real device plugin is scheduled.
Use `mock-device-plugin` when the goal is to test HAMi scheduling behavior without executing workloads on a physical accelerator.The mock plugin is intended for development/testing and does not provide actual GPU execution or GPU performance validation.

When testing HAMi on a machine without a supported NVIDIA GPU, the real NVIDIA device plugin cannot initialize successfully. For scheduler development and testing without physical accelerator hardware, use the HAMi `mock-device-plugin`.

### Error seen

After installing HAMi, check the pods:

```bash
kubectl get pods -n kube-system
```

The HAMi device plugin may enter `CrashLoopBackOff`.

Check its logs:

```bash
kubectl logs -n kube-system <hami-device-plugin-pod> \
  -c device-plugin --previous
```

The logs may contain:

```text
Incompatible strategy detected auto
If this is a GPU node, did you configure the NVIDIA Container Toolkit?
If this is not a GPU node, you should set up a toleration or nodeSelector
to only deploy this plugin on GPU nodes
error starting plugins: ... invalid device discovery strategy
```

### Why it happens

The real NVIDIA device plugin uses the NVIDIA discovery strategy and requires the NVIDIA driver/container runtime stack on the host.A GPU-less development machine does not provide that stack. If the node is labelled so that the real device plugin is scheduled there, the plugin attempts to initialize and fails.
The standard HAMi Quick Start is intended for an environment with the required accelerator prerequisites.

---

## Problem 1: Mock device plugin reports devices as unhealthy

Use this section when the HAMi `mock-device-plugin` is running but repeatedly reports configured devices as unhealthy and the corresponding vendor resources do not appear in the node's `Allocatable` resources.

Check the mock plugin pod:

```bash
kubectl get pods -n kube-system | grep mock-device-plugin
```

Then inspect its logs:

```bash
kubectl logs -n kube-system <mock-device-plugin-pod> --tail=100
```

You may see repeated messages such as:

```text
device NVIDIA is unhealthy on this node
device Ascend910A is unhealthy on this node
device Ascend910B2 is unhealthy on this node
```

The messages may repeat on every reconciliation cycle and waiting for the plugin to retry does not provide the missing resource.

Check the node's resources:

```bash
kubectl get node <node-name> \
  -o json | jq '.status.capacity'
```

and:

```bash
kubectl get node <node-name> \
  -o json | jq '.status.allocatable'
```

### Why this happens

The mock device plugin uses node metadata when constructing its virtual device resources. For a mock-only environment, two pieces of node state are important:

1. A vendor registration annotation describing the mock device.
2. A non-zero vendor count resource in the node's `status.capacity`.

The count resource is used by the plugin's health check. The relevant logic checks whether the node already has a non-zero value for the configured count resource and if the resource is absent, the device is considered unhealthy and resource construction returns without advertising the mock device resources.
For NVIDIA, the count resource is:

```text
nvidia.com/gpu
```

On a fresh mock-only node, this resource may not exist yet which can create a bootstrap dependency:

```text
CheckHealthy() -> count resource absent from node.Status.Capacity -> device considered unhealthy ->resource registration does not proceed ->count resource is still absent ->CheckHealthy()
```
### Diagnose the health gate

Check whether the count resource exists:
[code block 1 and 2]
```bash
kubectl get node <node-name> \
  -o json | jq '.status.capacity["nvidia.com/gpu"]'
```

A missing value or a zero value indicates that the NVIDIA count resource has not satisfied the health check. 
Also check the vendor registration annotation:

```bash
kubectl get node <node-name> \
  -o json | jq -r '.metadata.annotations["hami.io/node-nvidia-register"]'
```

The annotation should contain the mock device configuration being used for the test.

### Bootstrap a mock-only NVIDIA test node

For local testing, seed a non-zero NVIDIA count resource:

```bash
kubectl patch node <node-name> \
  --subresource=status \
  --type=json \
  -p '[{"op":"add","path":"/status/capacity/nvidia.com~1gpu","value":"1"}]'
```

Then provide the corresponding mock-device registration annotation.

For example:

```bash
kubectl annotate node <node-name> \
  'hami.io/node-nvidia-register=[{"id":"GPU-MOCK-0","count":1,"devmem":81920,"devcore":100,"type":"NVIDIA-A100-SXM4-80GB","health":true,"numa":0,"mode":"hami-core"}]'
```

Use values appropriate to the mock device you intend to simulate. The status patch is a local testing/bootstrap workaround and not a replacement for a normal device-plugin registration flow and should not be applied to production nodes as a way of claiming that hardware exists. After the mock plugin reconciles the node, verify the node's allocatable resources:

```bash
kubectl get node <node-name> \
  -o json | jq '.status.allocatable
    | with_entries(select(.key | test("nvidia.com")))'
```
For an NVIDIA mock device, resources such as the following may appear:

```text
nvidia.com/gpu
nvidia.com/gpumem
nvidia.com/gpucores
nvidia.com/gpumem-percentage
```

The exact set depends on the mock device configuration. You can verify the count resource and registration annotation by doing codeblock 1 and 2.

The vendor count resource is used as a health gate and doesnt describe the complete properties of the mock device. The mock device configuration, including the simulated device properties, is provided through the vendor registration configuration.This is suitable for testing HAMi's scheduler and resource-placement behavior without physical accelerator hardware and does not provide realtime GPU execution; NVIDIA driver/runtime validation; accelerator performance measurements; validation of hardware-specific runtime behavior.Use a real supported accelerator environment when testing functionality that depends on physical hardware or vendor runtime components.

---

## Problem 2: Scheduler pod enters `ImagePullBackOff` while pulling `kube-scheduler`

During validation of HAMi on a Fedora/`kind` environment, the scheduler pod also encountered an image-pull failure for the configured `kube-scheduler` image.

The observed error was:

```text
failed to resolve reference ...:
tls: failed to verify certificate:
x509: certificate signed by unknown authority
```

The HAMi scheduler extender image from Docker Hub pulled successfully in the same environment.This behavior was reproduced in the validation environment, but the investigation did not establish whether the TLS failure is:

* specific to that environment's certificate trust configuration; or
* a broader issue affecting other networks using the configured registry mirror.

For that reason, this observation is recorded here for visibility rather than presented as a general HAMi failure with a universal workaround.

### Solution: 
When this occurs, inspect the scheduler pod events:

```bash
kubectl describe pod -n kube-system <hami-scheduler-pod>
```

and verify which image and registry failed:

```bash
kubectl get pod -n kube-system <hami-scheduler-pod> \
  -o json | jq '.spec.containers[].image'
```

If the failure is caused by TLS certificate verification, investigate the container runtime's trust configuration and the accessibility of the configured registry from the affected node.

---
GPU-less kind validation environment

The troubleshooting above was validated using:

OS: Fedora Linux
CPU: Intel Core i3-5005U, 2 cores / 4 threads
GPU: Intel HD Graphics 5500 integrated graphics; no CUDA-capable discrete GPU
RAM: 16 GB
Cluster	kind, single control-plane node
Kubernetes	v1.36.1
HAMi chart	hami-charts/hami
HAMi image	docker.io/projecthami/hami:v2.9.0
mock-device-plugin	main at time of testing

This environment was intentionally selected to represent a contributor attempting to evaluate HAMi without access to a discrete accelerator.

For a disposable kind cluster, clean up with:

`kind delete cluster --name <cluster-name>`

--
