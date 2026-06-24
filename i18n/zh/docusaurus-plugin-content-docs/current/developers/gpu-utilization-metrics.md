---
id: gpu-utilization-metrics
title: GPU 利用率指标
sidebar_label: GPU 利用率指标
translated: true
---

## 概述

HAMi 支持将单张 NVIDIA GPU 卡划分为多张 vGPU 卡，以高效利用 GPU 容量。然而，当一张 vGPU 被分配给某个 Pod 时，HAMi 目前并不会暴露每个 Pod 的 GPU 利用率指标。这使得用户无法观测每个 Pod 实际消耗了多少 GPU。

本文档描述了为每个 Pod 增加 vGPU 利用率监控的设计方案。

## 动机

### 目标

- 支持监控每个 Pod 的 vGPU 利用率。

### 非目标

- 不支持监控非 NVIDIA GPU 的 GPU 利用率。

## 设计细节

### 在 `shared_region` 中扩展 `gpu_util` 字段

在 `shrreg_proc_slot_t` 中新增一个 `gpu_util` 字段，用于记录每个进程的 GPU 利用率：

```c
typedef struct {
    uint64_t dec_util;
    uint64_t enc_util;
    uint64_t sm_util;
} device_gpu_t;

typedef struct {
    int32_t pid;
    int32_t hostpid;
    device_memory_t used[CUDA_DEVICE_MAX_COUNT];
    uint64_t monitorused[CUDA_DEVICE_MAX_COUNT];
    int32_t status;
    device_gpu_t gpu_util[CUDA_DEVICE_MAX_COUNT]; // new field
} shrreg_proc_slot_t;


int set_gpu_device_gpu_monitor(int32_t pid, int dev, unsigned int smUtil) {
    int i;
    ensure_initialized();
    lock_shrreg();
    for (i = 0; i < region_info.shared_region->proc_num; i++) {
        if (region_info.shared_region->procs[i].hostpid == pid) {
            region_info.shared_region->procs[i].gpu_util[dev].smUtil = smUtil;
            break;
        }
    }
    unlock_shrreg();
    return 1;
}
```

### 更新 `get_used_gpu_utilization`

更新 `get_used_gpu_utilization` 方法，以记录当前 pid 的 GPU 使用率：

```c
int get_used_gpu_utilization(int *userutil, int *sysprocnum) {
    // ...
    for (i = 0; i < processes_num; i++) {
        set_gpu_device_memory_monitor(processes_sample[i].pid, cudadev, summonitor);
        set_gpu_device_gpu_monitor(processes_sample[i].pid, cudadev, processes_sample[i].smUtil); // new
    }
    // ...
    return 0;
}
```

### 通过 vGPUMonitor 暴露指标

更新 `vGPUMonitor`，使其从共享区域读取 `sm_util` 并将其作为 Prometheus 指标暴露：

```go
ctrDeviceUtilizationdesc = prometheus.NewDesc(
    "Device_utilization_desc_of_container",
    "Container device utilization description",
    []string{"podnamespace", "podname", "ctrname", "vdeviceid", "deviceuuid"}, nil,
)

func getTotalUtilization(usage podusage, vidx int) deviceUtilization {
    added := deviceUtilization{decUtil: 0, encUtil: 0, smUtil: 0}
    for _, val := range usage.sr.procs {
        added.decUtil += val.gpuUtil[vidx].decUtil
        added.encUtil += val.gpuUtil[vidx].encUtil
        added.smUtil  += val.gpuUtil[vidx].smUtil
    }
    return added
}

utilization := getTotalUtilization(srPodList[sridx], i)

ch <- prometheus.MustNewConstMetric(
    ctrDeviceUtilizationdesc,
    prometheus.GaugeValue,
    float64(utilization.smUtil),
    val.Namespace, val.Name, ctrName, fmt.Sprint(i), uuid,
)
```

## 测试计划

在同一节点上部署多个主动使用 GPU 的 Pod，验证 HAMi 通过 Prometheus 指标端点暴露的每个 Pod GPU 利用率是否准确。
