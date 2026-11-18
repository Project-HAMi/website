---
title: 离线验证调度器配置
sidebar_label: 验证调度器配置
---

使用 HAMi 的 `scheduler` 二进制文件，可以在部署前或 CI 流程中检查配置。请选择包含 `validate` 子命令的构建，最好与计划部署的构建一致。以下两个命令均无需 Kubernetes 凭据、运行中的集群或 GPU。

## 验证设备配置文件

传入准备通过 `--device-config-file` 提供给调度器的设备 YAML 文件。下面是一个最小示例，将其保存为 `device-config.yaml`：

```yaml
nvidia:
  resourceCountName: nvidia.com/gpu
```

```bash
scheduler validate device-config ./device-config.yaml
```

该命令解析文件并应用调度器的设备配置检查，其中包括各后端的默认值。文件不存在、YAML 格式错误或设备设置无效都可能导致验证失败。

## 验证调度器启动参数

传入计划用于启动 HAMi 调度器的参数。如果通过 Helm 部署，请使用渲染结果中 `vgpu-scheduler-extender` 容器的参数。此子命令直接接收命令行参数，设备 YAML 文件需单独检查。

```bash
scheduler validate scheduler-config \
  --device-plugin-namespace=kube-system \
  --device-plugin-service-account=hami-device-plugin \
  --node-affinity-score-weight=0
```

请将命名空间和 ServiceAccount 名称替换为实际部署中的值，两者均不能为空。节点亲和性评分权重必须为有限的非负数。请在部署时另行确认集群中存在对应的 ServiceAccount，并检查所配置的端口是否可用。

## 查看验证结果

验证通过时，命令会输出确认信息并返回退出状态码 `0`。即使验证通过，也可能出现警告。例如，扩展器绑定在非回环地址上，或启用性能分析后将其绑定在非回环地址上，都会产生警告。验证失败时，命令返回非零退出状态码，CI 可据此将该步骤标记为失败。
