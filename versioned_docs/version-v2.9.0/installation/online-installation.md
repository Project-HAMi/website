---
sidebar_label: Online Installation from Helm
title: Online Installation from Helm (Recommended)
---

The recommended way to deploy HAMi in a Kubernetes cluster is via the official Helm chart.

## 1. Add HAMi Helm Repository {#add-hami-repo}

Add the HAMi chart repository and update local repository cache:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

## 2. Deploy HAMi {#deploy-hami}

Deploy HAMi into the `kube-system` namespace using Helm:

```bash
helm install hami hami-charts/hami -n kube-system
```

:::note

The Helm chart automatically detects your Kubernetes server version and pulls the matching `kubeScheduler` image. If you need to manually override the image tag (for example, in custom or air-gapped environments), you can pass `--set scheduler.kubeScheduler.image.tag=<version>`.

:::

### Customizing Helm Configurations

You can customize your deployment by passing parameters with `--set` or providing a custom `values.yaml` file:

```bash
helm install hami hami-charts/hami -n kube-system -f custom-values.yaml
```

For a detailed breakdown of available chart options and configuration keys, see the [Configuration Guide](../userguide/configure.md).

## 3. Verify Installation {#verify-installation}

Verify that the HAMi components (`hami-device-plugin` and `hami-scheduler`) are running correctly:

```bash
kubectl get pods -n kube-system | grep hami
```

If both `hami-device-plugin` and `hami-scheduler` pods are in the `Running` state, your installation is successful.
