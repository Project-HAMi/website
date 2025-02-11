---
title: 分配到特定设备类型
translated: true
---

## 分配到特定设备类型

您需要在 `cambricon-device-plugin` 中添加参数 `- --enable-device-type` 以支持设备类型规范。当设置此选项时，不同类型的 MLU 将生成不同的资源名称，例如 `cambricon.com/mlu370.smlu.vcore` 和 `cambricon.com/mlu370.smlu.vmemory`。

```
      resources:
        limits:
          cambricon.com/vmlu: 1 # 请求 1 个 MLU
          cambricon.com/mlu370.smlu.vmemory: "20" # 每个 GPU 包含 20% 的设备内存
          cambricon.com/mlu370.smlu.vcore: "10" # 每个 GPU 包含 10% 的计算核心
```
