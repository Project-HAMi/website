---
linktitle: 通过 Helm 在线安装
title: 通过 Helm 在线安装（推荐）
translated: true
---

推荐使用 Helm 部署 HAMi。

## 添加 HAMi 仓库

你可以使用以下命令添加 HAMi 图表仓库：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

## 获取你的 Kubernetes 版本

安装时需要 Kubernetes 版本。你可以使用以下命令获取此信息：

```bash
kubectl version --short
```

## 安装

确保 `scheduler.kubeScheduler.imageTag` 与你的 Kubernetes 服务器版本匹配。
例如，如果你的集群服务器版本是 v1.16.8，请使用以下命令进行部署：

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag=v1.16.8 -n kube-system
```

你可以通过编辑[配置](../userguide/configure.md)来自定义安装。

## 验证你的安装

你可以使用以下命令验证你的安装：

```bash
kubectl get pods -n kube-system
```

如果 hami-device-plugin 和 hami-scheduler 这两个 Pod 都处于 Running 状态，则说明你的安装成功。
