---
title: HAMi on AWS
translated: true
---

HAMi 已经在 AWS 市场上发布，你可以通过 helm 或 AWS add-on 快速安装。

## 准备工作

在安装前，请确保你已经：

- 在市场上订阅了 HAMi
- 创建了一个 Kubernetes 集群

## 使用 Helm 安装

你可以使用以下命令获取 HAMi 的 Helm chart 并安装：

```shell
export HELM_EXPERIMENTAL_OCI=1
# The `username` and `password-stdin` correspond to your AWS login credentials.
aws ecr get-login-password --region us-east-1 | helm registry login --username AWS --password-stdin 709825985650.dkr.ecr.us-east-1.amazonaws.com
mkdir awsmp-chart && cd awsmp-chart
helm pull oci://709825985650.dkr.ecr.us-east-1.amazonaws.com/dynamia-ai/hami --version 2.6.1-community
tar xf $(pwd)/* && find $(pwd) -maxdepth 1 -type f -delete
helm install --generate-name --namespace <ENTER_NAMESPACE_HERE> ./*
```

您可以通过调整[配置](../userguide/configure.md)来自定义安装。

## 使用 AWS add-on 安装

在使用 AWS add-on 安装 HAMi 前，你需要安装 cert-manager，你可以在 AWS 插件市场中找到该插件并通过控制台安装。
你也可以参考[AWS 用户指南](https://docs.aws.amazon.com/eks/latest/userguide/lbc-manifest.html#lbc-cert)进行安装。

然后你就可以使用 AWS 插件市场中的 HAMi 插件进行安装。

## 验证您的安装

您可以使用以下命令验证您的安装：

```bash
kubectl get pods -n kube-system
```

如果 hami-device-plugin 和 hami-scheduler pods 都处于 Running 状态，则说明您的安装成功。

## 使用示例

### NVIDIA 设备

[使用独占 GPU](https://project-hami.io/zh/docs/userguide/NVIDIA-device/examples/use-exclusive-card)
[为容器分配特定设备显存](https://project-hami.io/zh/docs/userguide/NVIDIA-device/examples/allocate-device-memory)
[为容器分配设备核心资源](https://project-hami.io/zh/docs/userguide/NVIDIA-device/examples/allocate-device-core)
[将任务分配给 mig 实例](https://project-hami.io/zh/docs/userguide/NVIDIA-device/examples/dynamic-mig-example)
