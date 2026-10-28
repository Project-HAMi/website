---
title: 离线安装
---

如果你的集群无法直接访问互联网，可以通过离线方式安装 HAMi。

## 准备镜像

你需要将以下镜像保存为 tar 包，并拷贝到集群中：

```yaml
docker.io/projecthami/hami:{HAMi 版本} registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9 registry.k8s.io/kube-scheduler:{你的 kubernetes 版本}
```

:::note 中国镜像源

中国开发者在联网环境中准备离线镜像时，可以尝试从 `m.daocloud.io/docker.io/projecthami/hami`、`registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler` 和 `registry.cn-hangzhou.aliyuncs.com/google_containers/kube-webhook-certgen` 拉取对应镜像。

[m.daocloud.io](https://m.daocloud.io) 不保证稳定性和可用性，不能作为稳定可靠的镜像源依赖。拉取失败时，请改用上游仓库或其他可用镜像源。

:::

加载镜像，将其打上你们内部镜像仓库的 tag，并推送到内部仓库。

```bash
docker load -i {HAMi_image}.tar
docker tag docker.io/projecthami/hami:{HAMi 版本} {your_inner_registry}/hami:{HAMi 版本}
docker push {your_inner_registry}/hami:{HAMi 版本}
docker tag registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9 {your_inner_registry}/kube-webhook-certgen:v1.6.9
docker push {your_inner_registry}/kube-webhook-certgen:v1.6.9
docker tag registry.k8s.io/kube-scheduler:{你的 kubernetes 版本} {your_inner_registry}/kube-scheduler:{你的 kubernetes 版本}
docker push {your_inner_registry}/kube-scheduler:{你的 kubernetes 版本}
```

## 准备 HAMi Chart

从 [GitHub](https://github.com/Project-HAMi/HAMi/tree/master/charts) 下载 charts 目录，将其放入集群中的 `${CHART_PATH}` 目录下，然后修改 `${CHART_PATH}/hami/values.yaml` 中的以下字段：

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
helm install hami hami --set scheduler.kubeScheduler.image.tag={你的 k8s 服务器版本} -n kube-system
```

## 验证安装

执行以下命令：

```bash
kubectl get pods -n kube-system
```

如果可以看到 `device-plugin` 和 `scheduler` 都处于运行状态，则说明 HAMi 安装成功。
