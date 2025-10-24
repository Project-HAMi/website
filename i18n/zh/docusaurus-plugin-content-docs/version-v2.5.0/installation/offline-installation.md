---
title: 离线安装
translated: true
---

如果您的集群无法直接访问外部网络，您可以使用离线部署来安装 HAMi。

## 准备您的镜像

您需要将以下镜像保存到一个 tarball 文件中，并将其复制到集群中。

```
projecthami/hami:{HAMi 版本} 
docker.io/jettech/kube-webhook-certgen:v1.5.2
liangjw/kube-webhook-certgen:v1.1.1
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:{您的 kubernetes 版本}
```

加载这些镜像，将这些镜像标记为您的内部镜像仓库，并将它们推送到您的镜像仓库中。

```
docker load -i {HAMi_image}.tar
docker tag projecthami/hami:{HAMi 版本} {your_inner_registry}/hami:{HAMi 版本}
docker push {your_inner_registry}/hami:{HAMi 版本}
docker tag docker.io/jettech/kube-webhook-certgen:v1.5.2 {your inner_registry}/kube-webhook-certgen:v1.5.2
docker push {your inner_registry}/kube-webhook-certgen:v1.5.2
docker tag liangjw/kube-webhook-certgen:v1.1.1 {your_inner_registry}/kube-webhook-certgen:v1.1.1
docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:{您的 kubernetes 版本} {your_inner_registry}/kube-scheduler:{您的 kubernetes 版本}
docker push {your_inner_registry}/kube-scheduler:{您的 kubernetes 版本}
```

## 准备 HAMi chart

从 [github](https://github.com/Project-HAMi/HAMi/tree/master/charts) 下载 charts 文件夹，
将其放置在集群内的 $\{CHART_PATH\}，然后编辑 $\{CHART_PATH\}/hami/values.yaml 中的以下字段。

```yaml
scheduler:
  kubeScheduler:
    image: <your-image>
  extender:
    image: <your-image>
  patch:
    image: <your-image>
    imageNew: <your-image>
  devicePlugin:
    image: <your-image>
    monitorImage: <your-image>
```

在 $\{CHART_PATH\} 文件夹中执行以下命令：

```bash
helm install hami hami --set scheduler.kubeScheduler.imageTag={您的 k8s 服务器版本} -n kube-system
```

## 验证您的安装

执行以下命令：

```bash
kubectl get pods -n kube-system
```

如果您可以看到 'device-plugin' 和 'scheduler' 都在运行，那么表明 HAMi 已被成功安装。
