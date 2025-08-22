---
title: FAQ
---


## Supported Device Vendors and Specific Models

| **GPU Vendor** | **GPU Model** | **Granularity** | **Multi-GPU Support** |
| --- | --- | --- | --- |
| NVIDIA | Almost all mainstream consumer and data center GPUs | Core 1%, Memory 1M | Supported. Multi-GPU can still be split and shared using virtualization. |
| Ascend | 910A, 910B2, 910B3, 310P | Minimum granularity depends on the card type template. Refer to the [official templates](https://www.hiascend.com/document/detail/zh/mindx-dl/50rc1/AVI/cpaug/cpaug_0005.html). | Supported, but splitting is not supported when `npu > 1`. The entire card is exclusively allocated. |
| Hygon | Z100, Z100L, K100-AI | Core 1%, Memory 1M | Supported, but splitting is not supported when `dcu > 1`. The entire card is exclusively allocated. |
| Cambricon | 370, 590 | Core 1%, Memory 256M | Supported, but splitting is not supported when `mlu > 1`. The entire card is exclusively allocated. |
| Iluvatar | All | Core 1%, Memory 256M | Supported, but splitting is not supported when `gpu > 1`. The entire card is exclusively allocated. |
| Mthreads | MTT S4000 | Core 1 core group, Memory 512M | Supported, but splitting is not supported when `gpu > 1`. The entire card is exclusively allocated. |
| Metax | MXC500 | Does not support splitting, only whole card allocation is possible. | Supported, but all allocations are for whole cards. |


## What is vGPU? Why can't I allocate two vGPUs on the same card despite seeing 10 vGPUs?

**TL;DR**

vGPU increases GPU utilization by enabling multiple tasks to share one GPU through logical splitting. A `deviceSplitCount: 10` means the GPU can serve up to 10 tasks simultaneously but does not allow a single task to use multiple vGPUs from the same GPU.

---

### Concept of vGPU

A vGPU is a logical instance of a physical GPU created using virtualization, allowing multiple tasks to share the same physical GPU. For example, setting `deviceSplitCount: 10` means a physical GPU can allocate resources to up to 10 tasks. This allocation does not increase physical resources; it only defines logical visibility.

**Why can't I allocate two vGPUs on the same card?**

1. **Significance of vGPU**
   vGPU represents different task views of the same physical GPU. It is not a separate partition of physical resources. When a task requests `nvidia.com/gpu: 2`, it is interpreted as requiring two physical GPUs, not two vGPUs from the same GPU.

2. **Resource Allocation Mechanism**
   vGPU is designed to allow multiple tasks to share one GPU, not to bind multiple vGPUs to a single task on the same GPU. A `deviceSplitCount: 10` configuration enables up to 10 tasks to use the same GPU concurrently but does not permit one task to use multiple vGPUs.

3. **Consistency Between Container and Node Views**
   The GPU UUID inside the container matches the physical node's UUID, reflecting the same GPU. Although there may be 10 visible vGPUs, these are logical overcommit views, not additional independent resources.

4. **Design Intent**
   The design of vGPU aims to **allow one GPU to be shared by multiple tasks**, rather than letting one task occupy multiple vGPUs on the same GPU. The purpose of vGPU overcommitment is to improve GPU utilization, not to increase resource allocation for individual tasks.

## HAMi's `nvidia.com/priority` field only supports two levels. How can we implement multi-level, user-defined priority-based scheduling for a queue of jobs, especially when cluster resources are limited?

**TL;DR**

HAMi's built-in two-level priority is for runtime preemption on a single GPU (e.g., an urgent task pausing a less critical one on the same card). For scheduling a queue of jobs based on multiple user-defined priorities, integrate HAMi with a scheduler like **Volcano**, which supports multi-level queue priorities for job allocation and preemption.

---

HAMi's native `nvidia.com/priority` field (0 for high, 1 for low/default) is specifically designed for **runtime preemption on a single GPU**. The typical scenario it addresses is when a low-priority task (e.g., training) is running, and a high-priority task (e.g., inference) needs immediate access to that same GPU. In this case, the high-priority task will cause the low-priority task to pause, effectively ceding compute resources. Once the high-priority task completes, the low-priority task resumes. This mechanism is focused on immediate resource contention on a specific device, rather than for sorting a queue of many pending jobs with multiple priority levels for initial scheduling.

Regarding the scenario where resources are insufficient, 'n' jobs are waiting, and you need to sort them for scheduling based on multiple user-submitted priorities, HAMi's two-level system isn't intended for this broader scheduling requirement.

However, achieving multi-level priority scheduling **is feasible**. The recommended approach is to integrate HAMi with a more comprehensive scheduler like **Volcano**:

1. **Volcano for Multi-Level Scheduling Priority**:
    1. Volcano allows you to define multiple queues with different priority levels.
    2. It uses these queue priorities to determine the order in which jobs are allocated resources (including HAMi-managed vGPUs) and can manage preemption between jobs based on these wider scheduling priorities. This directly addresses the need for sorting the job queue based on multiple priority levels.
2. **HAMi for GPU Sharing & Its Runtime Priority**:
    1. HAMi integrates with Volcano via the [volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin).
    2. It continues to manage the vGPU sharing and its own two-level runtime priority for tasks contending on the *same physical GPU*, as described earlier.

In summary, while HAMi's own priority serves a different, device-specific purpose (runtime preemption on a single card), implementing multi-level job scheduling priority is achievable by using **Volcano in conjunction with HAMi**. Volcano would handle which job from the queue is prioritized for resource allocation based on multiple priority levels, and HAMi would manage the GPU sharing and its specific on-device preemption.

## Integration with Other Open-Source Tools

**Currently Supported**:

- **Volcano**: Can be integrated with Volcano by using the [`volcano-vgpu-device-plugin`](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) under the HAMi project for GPU resource scheduling and management.
- **Koordinator**: HAMi can also be integrated with Koordinator to provide end-to-end GPU sharing solutions. By deploying HAMi-core on nodes and configuring the appropriate labels and resource requests in Pods, Koordinator can leverage HAMi’s GPU isolation capabilities, allowing multiple Pods to share the same GPU and significantly improve GPU resource utilization.

  For detailed configuration and usage instructions, refer to the Koordinator documentation:
  [Device Scheduling - GPU Share With HAMi](https://koordinator.sh/docs/user-manuals/device-scheduling-gpu-share-with-hami/)

**Currently Not Supported**:

- **KubeVirt & Kata Containers**: Incompatible due to their reliance on virtualization for resource isolation, whereas HAMi’s GPU Device Plugin depends on direct GPU mounting into containers. Supporting these would require adapting the device allocation logic, balancing performance overhead and implementation complexity. HAMi prioritizes high-performance scenarios with direct GPU mounting and thus does not currently support these virtualization solutions.


## Why are there [HAMI-core Warn(...)] logs in my Pod's output? Can I disable them?

This is normal and can be ignored. If needed, disable the logs by setting the environment variable `LIBCUDA_LOG_LEVEL=0` in the container.


## Does HAMi support multi-node, multi-GPU distributed training? Does it support cross-host and cross-GPU scenarios?

**TL;DR**

HAMi supports multi-node, multi-GPU distributed training by scheduling multiple Pods on different nodes and leveraging distributed frameworks for cross-host and cross-GPU collaboration. A single Pod supports multiple GPUs on the same node.

---

### Multi-Node, Multi-GPU Distributed Training

HAMi supports distributed training in Kubernetes by running multiple Pods across different nodes and using distributed computing frameworks (e.g., PyTorch, TensorFlow, Horovod) to achieve multi-node, multi-GPU collaboration. Each Pod utilizes local GPU resources, and inter-node communication occurs via high-performance networks such as NCCL or RDMA.

### Cross-Host and Cross-GPU Scenarios

1. **Cross-Host**: Multiple Pods are scheduled on different nodes, and inter-node communication synchronizes gradients and updates parameters.
2. **Cross-GPU**: A single Pod can utilize multiple GPUs on the same node for computation tasks.

**Note**: A single Pod cannot span multiple nodes. If cross-host resource coordination is required, adopt **multi-Pod distributed training**, where the distributed framework manages task execution across hosts.


## Relationship and Compatibility Between HAMi Device Plugin, Volcano vGPU Device Plugin, and NVIDIA Official Device Plugin

**TL;DR**

Use only one GPU management plugin per node in a cluster to ensure clarity and stability in resource allocation.



### Their Relationship

These three Device Plugins all manage GPU resources but differ in usage scenarios and resource reporting methods:

- **HAMi Device Plugin**
  - Reports GPU resources to Kubernetes using the extended resource name `nvidia.com/gpu`.
  - Supports HAMi’s GPU resource management features, including custom vGPU splitting and scheduling.
  - Designed for complex resource management scenarios such as vGPU overcommitment and customized scheduling.

- **Volcano vGPU Device Plugin**
  - Reports vGPU resources using the extended resource name `volcano.sh/vgpu-number`.
  - Designed specifically for Volcano’s scheduling optimizations, supporting vGPU virtualization and distributed task scenarios.
  - Typically used in Volcano environments requiring finer-grained scheduling control.

- **NVIDIA Official Device Plugin**
  - Reports physical GPU resources using the extended resource name `nvidia.com/gpu`.
  - Provides basic GPU resource allocation functionalities.
  - Focuses on simple and stable GPU allocation scenarios, suitable for tasks that directly use physical GPUs.

### Coexistence

- **HAMi Device Plugin and NVIDIA Official Device Plugin**: Should not coexist to avoid resource conflicts.
- **HAMi Device Plugin and Volcano vGPU Device Plugin**: Can theoretically coexist, but using only one is recommended.
- **NVIDIA Official Device Plugin and Volcano vGPU Device Plugin**: Can theoretically coexist, but mixed usage is not advised.


## Why do Node Capacity and Allocatable show only `nvidia.com/gpu` and not `nvidia.com/gpucores` or `nvidia.com/gpumem`?

**TL;DR**

Device Plugins can only report a single resource type. GPU memory and compute information is stored as node annotations for use by the scheduler.

---

### Design Constraints of Device Plugins

- Device Plugin interfaces (e.g., Registration and ListAndWatch) only allow reporting and managing a single resource type per plugin instance.
- This design simplifies resource association management but restricts plugins from reporting multiple resource metrics (e.g., GPU compute power and memory).

### HAMi’s Implementation

- HAMi stores detailed GPU resource information (e.g., compute power, memory, model) as **node annotations** for use by the scheduler.
- Example annotation:
   ```
   hami.io/node-nvidia-register: GPU-fc28df76-54d2-c387-e52e-5f0a9495968c,10,49140,100,NVIDIA-NVIDIA L40S,0,true:GPU-b97db201-0442-8531-56d4-367e0c7d6edd,10,49140,100,...
   ```

### Follow-Up

**Why does the Node Capacity show `volcano.sh/vgpu-number` and `volcano.sh/vgpu-memory` when using `volcano-vgpu-device-plugin`?**

- The `volcano-vgpu-device-plugin` patches `volcano.sh/vgpu-number` and `volcano.sh/vgpu-memory` into Node Capacity and Allocatable via Kubernetes APIs instead of standard Device Plugin interfaces. Note that resources registered outside the kubelet’s standard mechanisms cannot be automatically updated or reclaimed by kubelet.


## Why don’t some domestic vendors require a runtime for installation?

Certain domestic vendors (e.g., Hygon, Cambricon) do not require a runtime because their DevicePlugin handles device discovery and mounting directly. In contrast, vendors like NVIDIA and Ascend rely on runtimes for environment configuration, device node mounting, and advanced functionality support.




**TL;DR**

If the official Device Plugin cannot meet specific requirements (e.g., insufficient information for advanced features), or if adapting it introduces complexity, HAMi implements its own Device Plugin.

---

HAMi's scheduler requires sufficient information from the Node to decode the corresponding GPU details, which can be provided via:

1. Patch Node Annotations.
2. Reporting resources via the Device Plugin interface to kubelet.
3. Directly patching the Node’s `status.capacity` and `status.allocatable`.

If the official Device Plugin cannot provide the required information, HAMi develops its own. For example:

- Ascend’s official Device Plugin requires a separate plugin for each card type. HAMi abstracts these card templates into a unified plugin for easier integration with the scheduler.
- NVIDIA requires custom implementations to support advanced features like compute and memory limits, overcommitment, and NUMA awareness, necessitating HAMi’s custom Device Plugin.