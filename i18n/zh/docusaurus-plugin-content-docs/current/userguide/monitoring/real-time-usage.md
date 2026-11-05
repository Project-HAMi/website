---
title: 实时 GPU 用量
sidebar_label: 实时用量
---

通过 HAMi 指标观察 GPU 利用率和显存使用量。节点 Capacity、Allocatable 和分配注解描述资源清单或分配结果，不代表实时使用量。

## GPU 与容器指标

按 [Grafana Dashboard 指南](./grafana-dashboard.md)配置 Prometheus 和仪表盘，同时采集两个 HAMi 指标来源：

| 来源                         | 用途                          |
| ---------------------------- | ----------------------------- |
| HAMi 调度器                  | 设备清单、容量和分配情况      |
| 各 GPU 节点上的 vGPU monitor | 物理 GPU 和容器 vGPU 的使用量 |

需要 NVIDIA 硬件遥测时，可按该指南添加 DCGM Exporter。其他厂商的设备插件和监控组件需单独部署，使用对应厂商的监控说明。

## 查看资源分配

以下示例使用 NVIDIA 默认资源名称。将命名空间、Pod、容器和节点名称替换为实际值。

查看节点可分配资源和已注册的 GPU 清单：

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable}'
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}'
```

查看 Pod 的资源请求、分配注解和事件：

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}'
```

这些信息用于解释调度和分配结果。实际利用率和显存使用量应查看监控指标。

## 检查 NVIDIA 设备可见性

工作负载镜像中提供 `nvidia-smi` 时，可查看容器内可见的设备：

```bash
kubectl exec -n <namespace> <pod-name> -c <container-name> -- nvidia-smi
```

输出取决于运行时和共享模式，不能代替 HAMi 的分配信息，也不能完整反映容器的算力配额。在宿主机执行 `nvidia-smi` 可查看物理 GPU。

## 检查组件状态

以下命令适用于 `kube-system` 中的默认 `hami` release：

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
kubectl logs -n kube-system -l app.kubernetes.io/instance=hami,app.kubernetes.io/component=hami-device-plugin -c device-plugin --tail=100
```

其他部署使用实际 release 标签和命名空间。单独安装的厂商插件有各自的标签和容器名称。排查分配失败时，还应查看 Pod 事件和调度器日志，见[故障排查指南](../../troubleshooting/troubleshooting.md)。
