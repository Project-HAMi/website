---
id: gpu-utilization-metrics
title: GPU Utilization Metrics
sidebar_label: GPU Utilization Metrics
---

## Summary

HAMi supports dividing a single NVIDIA GPU card into several vGPU cards to efficiently utilize GPU capacity. However, when a vGPU is assigned to a Pod, HAMi does not currently expose per-Pod GPU utilization metrics. This makes it impossible for users to observe how much GPU each Pod is actually consuming.

This document describes the design for adding per-Pod vGPU utilization monitoring.

## Motivation

### Goals

- Support monitoring of per-Pod vGPU utilization.

### Non-Goals

- Does not support monitoring GPU utilization for non-NVIDIA GPUs.

## Design Details

### Extend `shared_region` with a `gpu_util` Field

A new `gpu_util` field is added to `shrreg_proc_slot_t` to record per-process GPU utilization:

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

### Update `get_used_gpu_utilization`

The `get_used_gpu_utilization` method is updated to record the GPU usage rate of the current pid:

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

### Expose Metrics via vGPUMonitor

`vGPUMonitor` is updated to read `sm_util` from the shared region and expose it as a Prometheus metric:

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

## Test Plan

Deploy multiple Pods that actively use GPU on the same node and verify that HAMi exposes accurate per-Pod GPU utilization rates via the Prometheus metrics endpoint.
