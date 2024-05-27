---
title: Allocate certain device memory
---

## Allocate certain device memory to container

To allocate a certain size of GPU device memory, you need only to assign `huawei.com/ascend910-memory` besides `huawei.com/ascend910`.

```
      resources:
        limits:
          huawei.com/Ascend910: 1 # requesting 1 NPU
          huawei.com/Ascend910-memory: 2000 # requesting 2000m device memory
```

> **NOTICE:** * compute resource of Ascend910B is also limited with `huawei.com/Ascend910-memory`, equals to the percentage of device memory allocated. *