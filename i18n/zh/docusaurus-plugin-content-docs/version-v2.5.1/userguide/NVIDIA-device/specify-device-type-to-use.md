---
title: 分配到特定设备类型
translated: true
---

## 分配到特定设备类型

有时任务可能希望在某种类型的 GPU 上运行，可以在 pod 注释中填写 `nvidia.com/use-gputype` 字段。HAMi 调度器将检查 `nvidia-smi -L` 返回的设备类型是否包含注释的内容。

例如，具有以下注释的任务将被分配到 A100 或 V100 GPU

```yaml
metadata:
  annotations:
    nvidia.com/use-gputype: "A100,V100" # 为此作业指定卡类型，使用逗号分隔，不会在未指定的卡上启动作业
```

任务可以使用 `nvidia.com/nouse-gputype` 来避开某种类型的 GPU。在以下示例中，该作业不会被分配到 1080（包括 1080Ti）或 2080（包括 2080Ti）类型的卡。

```yaml
metadata:
  annotations:
    nvidia.com/nouse-gputype: "1080,2080" # 为此作业指定黑名单卡类型，使用逗号分隔，不会在指定的卡上启动作业