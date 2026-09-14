---
sidebar_label: 通过 Helm 在线安装
title: 通过 Helm 在线安装（推荐）
translated: true
---

推荐使用 Helm 部署 HAMi。

## 添加 HAMi 仓库

你可以使用以下命令添加 HAMi 图表仓库：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

## 检查 Kubernetes 版本

安装前，请先使用以下命令查看 Kubernetes 服务端版本：

```bash
kubectl version
```

## 安装

请确保 `scheduler.kubeScheduler.image.tag` 与 Kubernetes 服务端版本一致。例如，若集群运行的是 Kubernetes v1.29.0，可执行以下命令进行部署：

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.image.tag=v1.29.0 -n kube-system
```

你可以通过编辑[配置](../userguide/configure.md)来自定义安装。

## 验证你的安装

你可以使用以下命令验证你的安装：

```bash
kubectl get pods -n kube-system
```

当 hami-device-plugin 和 hami-scheduler Pod 均处于 `Running` 状态，且 `READY` 列显示所有容器已就绪时，即表示安装成功。
