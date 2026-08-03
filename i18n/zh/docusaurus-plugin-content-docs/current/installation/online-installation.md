---
sidebar_label: 通过 Helm 在线安装
title: 通过 Helm 在线安装（推荐）
translated: true
---

在 Kubernetes 集群中部署 HAMi 的推荐方式是使用官方 Helm Chart。

## 1. 添加 HAMi Helm 仓库 {#add-hami-repo}

添加 HAMi Chart 仓库并更新本地仓库缓存：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

## 2. 部署 HAMi {#deploy-hami}

使用标准 Helm 命令将 HAMi 部署至 `kube-system` 命名空间：

```bash
helm install hami hami-charts/hami -n kube-system
```

### 自定义 Helm 配置

您可以通过 `--set` 参数或指定自定义 `values.yaml` 文件来自定义部署配置：

```bash
helm install hami hami-charts/hami -n kube-system -f custom-values.yaml
```

详细的配置项说明请参阅 [配置指南](../userguide/configure.md)。

## 3. 验证安装 {#verify-installation}

验证 HAMi 组件（`hami-device-plugin` 与 `hami-scheduler`）是否正常运行：

```bash
kubectl get pods -n kube-system | grep hami
```

若 `hami-device-plugin` 和 `hami-scheduler` 的 Pod 均处于 `Running` 状态，则安装完成。
