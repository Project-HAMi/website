---
title: 离线安装
---

如果你的集群无法直接访问互联网，可以通过离线方式安装 HAMi。

## 准备应用镜像

先选择要安装的 Chart 版本（下载方式见[准备 HAMi Chart](#准备-hami-chart)），按该版本的默认配置和实际启用的功能准备应用镜像。以下镜像及覆盖配置面向 Next Chart；安装已发布版本时，请使用对应版本的文档和镜像配置。将所需应用镜像保存为 tar 包，并拷贝到离线环境：

- `docker.io/projecthami/hami:{HAMi 版本}`
- `registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9`
- `registry.k8s.io/kube-scheduler:{你的 kubernetes 版本}`

如果使用 Lupine 远程 GPU，还需按启用的功能准备以下镜像：

- `ghcr.io/lupinemachines/lupine-server:cuda-13.3.1-ubuntu24.04`：远程 GPU 服务端镜像，对应 `devices.remotegpu.server.image`。
- `ghcr.io/lupinemachines/lupine-client:cuda-13.3.1-ubuntu24.04`：向工作负载提供 Lupine 客户端库的镜像，对应 `devices.remotegpu.clientImage`。

:::note 中国镜像源

中国开发者在联网环境中准备离线镜像时，可以尝试从 `m.daocloud.io/docker.io/projecthami/hami`、`registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler`、`registry.cn-hangzhou.aliyuncs.com/google_containers/kube-webhook-certgen`、`m.daocloud.io/ghcr.io/lupinemachines/lupine-server` 和 `m.daocloud.io/ghcr.io/lupinemachines/lupine-client` 拉取对应镜像。

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

使用 Lupine 远程 GPU 时，将所需的额外镜像同样导入内部仓库。以下配置示例假设服务端和客户端镜像分别推送到 `{your_inner_registry}/lupine-server:cuda-13.3.1-ubuntu24.04` 和 `{your_inner_registry}/lupine-client:cuda-13.3.1-ubuntu24.04`。

## 准备 HAMi Chart

在联网机器上添加官方 Helm 仓库并查看可用版本：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
helm search repo hami-charts/hami --versions
```

将 `{Chart 版本}` 替换为选定的版本号，下载对应的 Chart 包：

```bash
CHART_VERSION="{Chart 版本}"
helm pull hami-charts/hami --version "$CHART_VERSION" --destination .
helm show values "./hami-${CHART_VERSION}.tgz"
```

将下载的 `hami-${CHART_VERSION}.tgz` 传入离线环境。准备应用镜像、渲染配置和安装时应使用同一版本的 Chart。

不建议直接从持续变化的 `master` 分支下载 Chart 来替代选定的发行版本；如果需要尚未发布的 Next 功能，应从 [HAMi 源码仓库](https://github.com/Project-HAMi/HAMi)选择固定的提交，使用其中的 `charts/hami`，并通过 `helm package` 打包后传入离线环境。

在离线机器上进入存放 Chart 包的目录，设置本地包路径：

```bash
CHART_PACKAGE="./hami-{Chart 版本}.tgz"
```

## 配置镜像

本节仅说明离线安装所需的镜像覆盖配置。设备启用、运行时、节点和调度等其他配置，请参阅[配置文档](../userguide/configure.md)，并通过文档版本选择器切换到与所选 Chart 匹配的版本。将需要的配置一并写入覆盖文件。

先查看本地 Chart 包的默认配置：

```bash
helm show values "$CHART_PACKAGE"
```

在同一目录下创建独立的 `override-values.yaml`，通过 `-f` 覆盖配置，无须解包或修改 Chart 自带的 `values.yaml`。将以下占位符替换为前面推送镜像时使用的内部仓库地址和版本：

```yaml
global:
  imageRegistry: "{内部镜像仓库}"
  imageTag: "{HAMi 版本}"
scheduler:
  kubeScheduler:
    image:
      repository: kube-scheduler
      tag: "{你的 kubernetes 版本}"
  extender:
    image:
      repository: hami
  patch:
    imageNew:
      repository: kube-webhook-certgen
      tag: v1.6.9
devicePlugin:
  image:
    repository: hami
  monitor:
    image:
      repository: hami
```

这里需要将 `global.imageTag` 和 `scheduler.patch.imageNew.tag` 显式覆盖为内部仓库中已推送的 tag。

`global.imageRegistry` 统一设置镜像仓库地址。调度器扩展、设备插件和监控组件的 `image.tag` 未在覆盖文件中设置，会保留 Chart 中的空默认值，并继承 `global.imageTag`；kube-scheduler 和 certgen 使用各自配置的 tag。各组件的 `repository` 与前面的推送路径一致。

已启用 Lupine 远程 GPU 的部署，还需将以下镜像覆盖配置合并到同一份 `override-values.yaml` 中；镜像版本应与实际推送的 tag 一致：

```yaml
devices:
  remotegpu:
    server:
      image:
        repository: lupine-server
        tag: cuda-13.3.1-ubuntu24.04
    clientImage: "{your_inner_registry}/lupine-client:cuda-13.3.1-ubuntu24.04"
```

服务端镜像继承 `global.imageRegistry`，但不继承 `global.imageTag`，因此需要单独覆盖其默认的 digest。`clientImage` 是完整镜像引用，必须显式改为内部仓库地址。`libImage` 未设置或为 `null` 时，会复用前面配置的内部 HAMi 镜像；显式设置的 `libImage` 和非空的 `sessionImage` 也必须改为内部镜像引用。使用自定义 `device-config` 内容时，同样需要更新其中的镜像引用。

渲染远程 GPU 配置后，除服务端 DaemonSet 外，还应检查设备 ConfigMap 中的 `libImage`、`clientImage` 和 `sessionImage`，这些镜像用于后续创建的 Pod。

## 安装 HAMi

设置安装命名空间，以下使用 `kube-system`，可按需修改。先渲染配置，检查生成的命名空间、镜像地址和版本是否符合预期。将 `--kube-version` 的占位符替换为目标集群的 Kubernetes 版本：

```bash
NAMESPACE=kube-system
helm template hami "$CHART_PACKAGE" --namespace "$NAMESPACE" \
  -f override-values.yaml \
  --kube-version "{你的 kubernetes 版本}" > rendered.yaml
```

确认配置后，使用同一份覆盖文件安装：

```bash
helm install hami "$CHART_PACKAGE" \
  --namespace "$NAMESPACE" --create-namespace \
  -f override-values.yaml
```

## 验证安装

执行以下命令：

```bash
kubectl get pods --namespace "$NAMESPACE"
```

如果可以看到 `device-plugin` 和 `scheduler` 都处于运行状态，则说明 HAMi 安装成功。
