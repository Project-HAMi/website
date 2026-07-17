---
id: hami-vnpu-core-integration
title: HAMi vNPU Core Integration
sidebar_label: vNPU Core Integration
---

HAMi-vnpu-core is an Huawei Ascend NPU in-container resource controller written in Rust. It implements user-space interception via `libvnpu.so` (interceptor) and `Limiter` (manager). Two environment variables are used to declare resource quotas: `NPU_MEM_QUOTA` for memory limits and `NPU_PRIORITY` for scheduling priority. This design integrates that capability into HAMi scheduling to support Huawei Ascend NPU memory virtualization and compute time-slice soft partitioning.

## Prerequisites

Huawei Ascend driver version 25.5 or later is required. The chip must have device-share mode enabled:

```bash
npu-smi set -t device-share -i <id> -d <value>
```

| Parameter | Description                                                     |
| --------- | --------------------------------------------------------------- |
| `id`      | Device ID, obtained via `npu-smi info -l`                       |
| `value`   | Container sharing mode: `0` = disabled (default), `1` = enabled |

## HAMi Scheduler Changes

### Extended Resource Names

The existing `huawei.com/Ascend910B3-memory` resource is reused for memory allocation. A new `huawei.com/Ascend910B3-core` resource is added; pods that declare this resource use vnpu soft partitioning instead of the original hard partitioning logic.

| Resource Name                   | Unit    | Meaning             | Example        |
| ------------------------------- | ------- | ------------------- | -------------- |
| `huawei.com/Ascend910B3`        | integer | Number of NPU cards | 1              |
| `huawei.com/Ascend910B3-memory` | MiB     | Memory quota        | 28672 (28 GiB) |
| `huawei.com/Ascend910B3-core`   | integer | Percentage          | 20, 40         |

### Filter Phase

The `Fit` function core logic is updated to ensure that the total compute capacity across all containers on a single card does not exceed 100. `PatchAnnotation` is also updated to inject the new annotation format.

**Expected Pod quota annotation format:**

```json
{
  "huawei.com/Ascend910B3": "[
    {
      \"UUID\": \"xxx\",
      \"memory\": 28672,
      \"core\": 20
    }
  ]"
}
```

The `PatchAnnotations` function in `pkg/device/ascend/device.go` adds `memory` and `core` fields for vnpu soft partitioning:

```go
func (dev *Devices) PatchAnnotations(pod *corev1.Pod, annoInput *map[string]string, pd device.PodDevices) map[string]string {
    commonWord := dev.CommonWord()
    devList, ok := pd[commonWord]
    if ok && len(devList) > 0 {
        for _, dp := range devList {
            for _, val := range dp {
                rtInfo = append(rtInfo, RuntimeInfo{
                    UUID:     val.UUID,
                    Temp:     tempName,
                    MemQuota: memory,
                    Priority: core,
                })
            }
        }
    }
    return *annoInput
}
```

### Limiter Process Startup

The Limiter process is started via a Kubernetes `postStart` lifecycle hook injected by `MutateAdmission` in `pkg/device/ascend/device.go`:

```yaml
lifecycle:
  postStart:
    exec:
      command:
        - "bash"
        - "-c"
        - |
          export RUST_LOG=info
          /usr/local/hami-vnpu-core/limiter > /usr/local/hami-vnpu-core/inst1_manager.log 2>&1 &
```

Because `postStart` cannot guarantee completion before the container entrypoint, `libvnpu.so` loops until the Limiter's shared memory is available before allowing the workload to proceed:

```rust
impl SchedulerClient {
    pub fn new() -> Self {
        let pid = std::process::id();
        let shmem_name = local_shmem_name();
        let shm_path = format!("/dev/shm/{}", shmem_name);
        let mut retry_count = 0;

        while !std::path::Path::new(&shm_path).exists() {
            std::thread::sleep(std::time::Duration::from_millis(100));
            retry_count += 1;
            if retry_count > 600 {
                panic!("[Scheduler] FATAL: Limiter not found after 60 seconds.");
            }
        }

        let shmem = shmem::shm_setup::open_shmem::<LocalContainerShmem>(shmem_name.as_str());
    }
}
```

## Huawei Ascend Device Plugin Changes

### Host Path Layout

The Limiter binary and `libvnpu.so` are placed at a fixed host path so they can be mounted into containers:

```text
/usr/local/hami-vnpu-core/
├── limiter
├── libvnpu.so
└── ld.so.preload
```

`ld.so.preload` content:

```plaintext
/hami-vnpu-core/target/debug/libvnpu.so
```

### Shared Memory Directory

```bash
sudo mkdir -p /usr/local/hami-shared-region
sudo chmod 777 /usr/local/hami-shared-region
```

### Allocate Function Enhancements

The `Allocate` function in the device plugin is updated to inject the following into each container:

```go
func (ps *PluginServer) Allocate(ctx context.Context, reqs *v1beta1.AllocateRequest) {
    /*
    1. Volume mounts:
       A. Huawei driver and SMI toolchain
       B. vnpu-core binary path: /usr/local/hami-vnpu-core
       C. HAMi interceptor library via /etc/ld.so.preload
       D. HAMi compute-partition shared directory: /usr/local/hami-shared-region:/hami-shared-region

    2. Environment variables:
       A. Visible device IDs
       B. Shared memory path: NPU_GLOBAL_SHM_PATH = /hami-shared-region/{ID}_global_registry
       C. Memory quota: NPU_MEM_QUOTA (read from Annotation, e.g. 28672)
       D. Priority: NPU_PRIORITY (read from Annotation, e.g. 20)
    */
}
```
