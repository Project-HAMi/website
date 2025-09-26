---
title: WebUI 安装
translated: true
---

# 使用 Helm Charts 部署 HAMi-WebUI

本主题包含在 Kubernetes 上使用 Helm Charts 安装和运行 HAMi-WebUI 的说明。

WebUI 只能通过本地主机访问，因此您需要通过配置 `~/.kube/config` 将本地主机连接到集群。

[Helm](https://helm.sh/) 是一个用于管理 Kubernetes 应用程序的开源命令行工具。它是 [CNCF Landscape](https://www.cncf.io/projects/helm/) 中的一个毕业项目。

HAMi-WebUI 开源社区提供了在 Kubernetes 上运行的 Helm Charts。请注意，代码不提供任何担保。如果您遇到任何问题，可以在 [官方 GitHub 仓库](https://github.com/Project-HAMi/HAMi-WebUI/tree/main/charts/hami-webui)报告。

## 先决条件

要使用 Helm 安装 HAMi-WebUI，请确保满足以下要求：

1. 本地主机上的 Kubectl

2. [HAMi](https://github.com/Project-HAMi/HAMi?tab=readme-ov-file#quick-start) >= 2.4.0

3. Prometheus > 2.8.0

4. Helm > 3.0

## 使用 Helm 安装 HAMi-WebUI

### 部署 HAMi-WebUI Helm charts

要设置 HAMi-WebUI Helm 仓库，以便在您的机器上下载正确的 HAMi-WebUI Helm charts，请完成以下步骤：

1. 使用以下命令语法添加 HAMi-WebUI 仓库：

   ```bash
   helm repo add hami-webui https://project-hami.github.io/HAMi-WebUI
   ```

2. 使用以下命令部署 HAMi-WebUI：

   ```bash
   helm install my-hami-webui hami-webui/hami-webui --set externalPrometheus.enabled=true --set externalPrometheus.address="http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090" -n kube-system
   ```

   > _**重要**_：您需要将 'externalPrometheus.address' 的值替换为集群内的 Prometheus 地址

   您可以在安装期间根据配置[文档](https://github.com/Project-HAMi/HAMi-WebUI/blob/main/charts/hami-webui/README.md#values)在 [values.yaml](https://github.com/Project-HAMi/HAMi-WebUI/blob/main/charts/hami-webui/values.yaml) 中设置其他字段。

3. 运行以下命令以验证安装：

   ```bash
   kubectl get pods -n kube-system | grep webui
   ```

   如果安装成功，您应该看到 'hami-webui' 和 'hami-webui-dcgm-exporter' 都处于运行状态。

### 访问 HAMi-WebUI

1. 在本地主机中配置 ~/.kube/config 以便能够连接到您的集群。

2. 运行以下命令以在本地主机上对 HAMi-WebUI 服务进行端口转发，端口为 `3000`。

   ```bash
   kubectl port-forward service/my-hami-webui 3000:3000 --namespace=kube-system
   ```

   有关端口转发的更多信息，请参阅[使用端口转发访问集群中的应用程序](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/)。

3. 在浏览器中导航到 `localhost:3000`。

   HAMi-WebUI 资源概览页面将出现。

## 故障排除

本节包括在通过 Helm 在 Kubernetes 上部署 HAMi-WebUI 时可能会发现有用的故障排除提示。

### 收集日志

在排查任何问题时，查看 HAMi-WebUI 服务器日志非常重要。

要检查 HAMi-WebUI 日志，请运行以下命令：

```bash
kubectl logs --namespace=hami deploy/my-hami-webui -c hami-webui-fe-oss
kubectl logs --namespace=hami deploy/my-hami-webui -c hami-webui-be-oss
```

有关访问 Kubernetes 应用程序日志的更多信息，请参阅 [Pods](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#interacting-with-running-pods) 和 [Deployments](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#interacting-with-deployments-and-services)。

## 卸载 HAMi-WebUI 部署

要卸载 HAMi-WebUI 部署，请运行命令：

`helm uninstall <RELEASE-NAME> <NAMESPACE-NAME>`

```bash
helm uninstall my-hami-webui -n hami
```

这将删除给定命名空间 hami 中的所有对象。

如果您想删除命名空间 `hami`，请运行命令：

```bash
kubectl delete namespace hami
```
