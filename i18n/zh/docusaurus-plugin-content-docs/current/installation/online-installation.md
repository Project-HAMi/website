---
title: 通过 Helm 在线安装（推荐）
translated: true
---

最佳实践是使用 helm 部署 HAMi。

## 添加 HAMi 仓库

您可以使用以下命令添加 HAMi 图表仓库：

```
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

## 获取您的 Kubernetes 版本

安装时需要 Kubernetes 版本。您可以使用以下命令获取此信息：

```
kubectl version
```

## 安装

在安装过程中，将 Kubernetes 调度器镜像版本设置为与您的 Kubernetes 服务器版本匹配。例如，如果您的集群服务器版本是 1.16.8，请使用以下命令进行部署：

```
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag=v1.16.8 -n kube-system
```

您可以通过调整[配置](../userguide/configure.md)来自定义安装。

## 验证您的安装

您可以使用以下命令验证您的安装：

```
kubectl get pods -n kube-system
```

如果 hami-device-plugin 和 hami-scheduler pods 都处于 Running 状态，则说明您的安装成功。