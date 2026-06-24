---
id: hami-vnpu-core-integration
title: HAMi vNPU 核心集成
sidebar_label: vNPU 核心集成
translated: true
---

HAMi-vnpu-core 是一个使用 Rust 编写的 Huawei Ascend NPU 容器内资源控制器。它通过 `libvnpu.so`（拦截器）和 `Limiter`（管理器）实现用户态拦截。该设计使用两个环境变量来声明资源配额：`NPU_MEM_QUOTA` 用于内存限制，`NPU_PRIORITY` 用于调度优先级。本设计将该能力集成到 HAMi 调度中，以支持 Huawei Ascend NPU 的内存虚拟化和算力时间片软切分。

## 前提条件

需要 Huawei Ascend 驱动版本 25.5 或更高版本。芯片必须启用 device-share 模式：

```bash
npu-smi set -t device-share -i <id> -d <value>
```

| 参数    | 说明                                         |
| ------- | -------------------------------------------- |
| `id`    | 设备 ID，通过 `npu-smi info -l` 获取         |
| `value` | 容器共享模式：`0` = 禁用（默认），`1` = 启用 |

## HAMi 调度器变更

### 扩展资源名称

复用现有的 `huawei.com/Ascend910B3-memory` 资源用于内存分配。新增 `huawei.com/Ascend910B3-core` 资源；声明该资源的 Pod 使用 vnpu 软切分，而非原有的硬切分逻辑。

| 资源名称                        | 单位    | 含义       | 示例           |
| ------------------------------- | ------- | ---------- | -------------- |
| `huawei.com/Ascend910B3`        | integer | NPU 卡数量 | 1              |
| `huawei.com/Ascend910B3-memory` | MiB     | 内存配额   | 28672 (28 GiB) |
| `huawei.com/Ascend910B3-core`   | integer | 百分比     | 20, 40         |

### Filter 阶段

更新了 `Fit` 函数核心逻辑，以确保单张卡上所有容器的总算力不超过 100。同时更新了 `PatchAnnotation` 以注入新的 annotation 格式。

**预期的 Pod 配额 annotation 格式：**

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

`pkg/device/ascend/device.go` 中的 `PatchAnnotations` 函数为 vnpu 软切分新增了 `memory` 和 `core` 字段：

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

### Limiter 进程启动

Limiter 进程通过由 `pkg/device/ascend/device.go` 中 `MutateAdmission` 注入的 Kubernetes `postStart` 生命周期钩子启动：

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

由于 `postStart` 无法保证在容器 entrypoint 之前完成，`libvnpu.so` 会循环等待直到 Limiter 的共享内存可用，然后才允许工作负载继续执行：

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

## Huawei Ascend Device Plugin 变更

### 宿主机路径布局

Limiter 二进制文件和 `libvnpu.so` 放置在固定的宿主机路径上，以便挂载到容器中：

```
/usr/local/hami-vnpu-core/
├── limiter
├── libvnpu.so
└── ld.so.preload
```

`ld.so.preload` 内容：

```
/hami-vnpu-core/target/debug/libvnpu.so
```

### 共享内存目录

```bash
sudo mkdir -p /usr/local/hami-shared-region
sudo chmod 777 /usr/local/hami-shared-region
```

### Allocate 函数增强

device plugin 中的 `Allocate` 函数已更新，会向每个容器注入以下内容：

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
