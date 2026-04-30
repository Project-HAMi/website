---
title: 离线安装
---

如果你的集群无法直接访问互联网，可以通过离线方式安装 HAMi。

## 准备镜像

你需要将以下镜像保存为 tar 包，并拷贝到集群中：

```yaml
projecthami/hami:{HAMi 版本}
docker.io/jettech/kube-webhook-certgen:v1.5.2
liangjw/kube-webhook-certgen:v1.1.1
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:{你的 kubernetes 版本}
```

加载镜像，将其打上你们内部镜像仓库的 tag，并推送到内部仓库。

```bash
docker load -i {HAMi_image}.tar
docker tag projecthami/hami:{HAMi 版本} {your_inner_registry}/hami:{HAMi 版本}
docker push {your_inner_registry}/hami:{HAMi 版本}
docker tag docker.io/jettech/kube-webhook-certgen:v1.5.2 {your inner_registry}/kube-webhook-certgen:v1.5.2
docker push {your inner_registry}/kube-webhook-certgen:v1.5.2
docker tag liangjw/kube-webhook-certgen:v1.1.1 {your_inner_registry}/kube-webhook-certgen:v1.1.1
docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:{你的 kubernetes 版本} {your_inner_registry}/kube-scheduler:{你的 kubernetes 版本}
docker push {your_inner_registry}/kube-scheduler:{你的 kubernetes 版本}
```

## 准备 HAMi Chart

从 [GitHub](https://github.com/Project-HAMi/HAMi/tree/master/charts) 下载 charts 目录，
将其放入集群中的 `${CHART_PATH}` 目录下，然后修改 `${CHART_PATH}/hami/values.yaml` 中的以下字段：

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

在 `${CHART_PATH}` 目录下执行以下命令：

```bash
helm install hami hami --set scheduler.kubeScheduler.imageTag={你的 k8s 服务器版本} -n kube-system
```

## 验证安装

执行以下命令：

```bash
kubectl get pods -n kube-system
```

如果可以看到 `device-plugin` 和 `scheduler` 都处于运行状态，则说明 HAMi 安装成功。
