---
title: Ascend 设备模板
translated: true
---

Ascend 设备模板用于定义一块物理 Ascend 卡如何被切分成多个可租用的虚拟实例，供 HAMi 调度使用。
每个模板描述了对应卡型的可用显存、AI Core 以及可选的 CPU 资源。
当 Pod 申请 Ascend 相关资源时，HAMi 会根据请求的显存和算力，从这些模板中选择最合适的一种进行分配。

```yaml
vnpus:
- chipName: 910B
  commonWord: Ascend910A
  resourceName: huawei.com/Ascend910A
  resourceMemoryName: huawei.com/Ascend910A-memory
  memoryAllocatable: 32768
  memoryCapacity: 32768
  memoryFactor: 1
  aiCore: 30
  templates:
    - name: vir02
      memory: 2184
      aiCore: 2
    - name: vir04
      memory: 4369
      aiCore: 4
    - name: vir08
      memory: 8738
      aiCore: 8
    - name: vir16
      memory: 17476
      aiCore: 16
- chipName: 910B3
  commonWord: Ascend910B
  resourceName: huawei.com/Ascend910B
  resourceMemoryName: huawei.com/Ascend910B-memory
  memoryAllocatable: 65536
  memoryCapacity: 65536
  memoryFactor: 1
  aiCore: 20
  aiCPU: 7
  templates:
    - name: vir05_1c_16g
      memory: 16384
      aiCore: 5
      aiCPU: 1
    - name: vir10_3c_32g
      memory: 32768
      aiCore: 10
      aiCPU: 3
- chipName: 310P3
  commonWord: Ascend310P
  resourceName: huawei.com/Ascend310P
  resourceMemoryName: huawei.com/Ascend310P-memory
  memoryAllocatable: 21527
  memoryCapacity: 24576
  memoryFactor: 1
  aiCore: 8
  aiCPU: 7
  templates:
    - name: vir01
      memory: 3072
      aiCore: 1
      aiCPU: 1
    - name: vir02
      memory: 6144
      aiCore: 2
      aiCPU: 2
    - name: vir04
      memory: 12288
      aiCore: 4
      aiCPU: 4
```
