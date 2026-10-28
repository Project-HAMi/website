---
title: Offline Installation
---

If your cluster can’t directly access the internet, you can install HAMi offline.

## Prepare your images

You need to save the following images into a tarball file and copy it into the cluster.

```yaml
docker.io/projecthami/hami:{HAMi version} registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9 registry.k8s.io/kube-scheduler:{your kubernetes version}
```

:::note China mirrors

When preparing offline images in an internet-connected environment, developers in China can try pulling the corresponding images from `m.daocloud.io/docker.io/projecthami/hami`, `registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler`, and `registry.cn-hangzhou.aliyuncs.com/google_containers/kube-webhook-certgen`.

[m.daocloud.io](https://m.daocloud.io) does not guarantee stability or availability and should not be relied on as a stable mirror. If a pull fails, use the upstream registry or another available mirror.

:::

Load the images, tag them with your internal registry, and push them to your registry.

```shell
docker load -i {HAMi_image}.tar
docker tag docker.io/projecthami/hami:{HAMi version} {your_inner_registry}/hami:{HAMi version}
docker push {your_inner_registry}/hami:{HAMi version}
docker tag registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9 {your_inner_registry}/kube-webhook-certgen:v1.6.9
docker push {your_inner_registry}/kube-webhook-certgen:v1.6.9
docker tag registry.k8s.io/kube-scheduler:{your kubernetes version} {your_inner_registry}/kube-scheduler:{your kubernetes version}
docker push {your_inner_registry}/kube-scheduler:{your kubernetes version}
```

## Prepare HAMi chart

Download the charts folder from [github](https://github.com/Project-HAMi/HAMi/tree/master/charts), place it into $\{CHART_PATH\} inside cluster, then edit the following fields in $\{CHART_PATH\}/hami/values.yaml.

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

Run the following command in your $\{CHART_PATH\} folder:

```bash
helm install hami hami --set scheduler.kubeScheduler.image.tag={your k8s server version} -n kube-system
```

## Verify your installation

Run the following command:

```bash
kubectl get pods -n kube-system
```

If you can see both the 'device-plugin' and 'scheduler' running, then HAMi is installed successfully.
